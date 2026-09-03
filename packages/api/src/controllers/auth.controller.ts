import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma, { Prisma } from '@inventory-system/database';
import { isAPIError } from 'better-auth/api';
import { auth } from '../auth';
import { AuthRequest } from '../middleware/auth';
import { applyBetterAuthHeaders } from '../services/better-auth-response.service';
import { hashPassword, isLegacyBcryptHash } from '../services/password.service';
import { createVendorProfile, VENDOR_PORTAL_KEY } from '../services/vendor-profile.service';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const conflictError = (error: unknown): boolean =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class AuthController {
    /** Create the Better Auth identity and complete Vendor Portal Organization graph atomically. */
    static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = normalizeEmail(req.body.email);
            const { password, companyName } = req.body;
            const passwordHash = await hashPassword(password);
            const userId = crypto.randomUUID();
            const vendorProfileId = crypto.randomUUID();
            const organizationId = crypto.randomUUID();
            const now = new Date();

            const created = await prisma.$transaction(
                async (transaction) => {
                    const user = await transaction.user.create({
                        data: {
                            id: userId,
                            name: companyName,
                            email,
                            emailVerified: false,
                            createdAt: now,
                            updatedAt: now,
                        },
                    });
                    await transaction.account.create({
                        data: {
                            id: crypto.randomUUID(),
                            issuer: 'local:credential',
                            accountId: userId,
                            providerId: 'credential',
                            userId,
                            password: passwordHash,
                            createdAt: now,
                            updatedAt: now,
                        },
                    });
                    await transaction.organization.create({
                        data: {
                            id: organizationId,
                            name: companyName,
                            slug: `vendor-${organizationId.replaceAll('-', '')}`,
                            createdAt: now,
                        },
                    });
                    const ownerMember = await transaction.member.create({
                        data: {
                            id: crypto.randomUUID(),
                            organizationId,
                            userId,
                            role: 'owner',
                            createdAt: now,
                        },
                    });
                    await transaction.portal.upsert({
                        where: { key: VENDOR_PORTAL_KEY },
                        create: {
                            key: VENDOR_PORTAL_KEY,
                            name: 'Vendor Portal',
                            description: 'Producer and vendor catalog management portal',
                        },
                        update: { name: 'Vendor Portal' },
                    });
                    await transaction.organizationPortalSubscription.create({
                        data: {
                            organizationId,
                            portalKey: VENDOR_PORTAL_KEY,
                            status: 'ACTIVE',
                            startsAt: now,
                        },
                    });
                    await transaction.memberPortalAccess.create({
                        data: {
                            memberId: ownerMember.id,
                            portalKey: VENDOR_PORTAL_KEY,
                            enabled: true,
                            grantedByUserId: userId,
                            updatedByUserId: userId,
                        },
                    });
                    const profile = await createVendorProfile(transaction, {
                        organizationId,
                        profileId: vendorProfileId,
                        profileKey: 'primary',
                        displayName: companyName,
                    });
                    return { user, profile };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );

            const { headers } = await auth.api.signInEmail({
                returnHeaders: true,
                body: { email, password },
                headers: fromNodeHeaders(req.headers),
            });
            applyBetterAuthHeaders(res, headers);

            void auth.api
                .sendVerificationEmail({ body: { email, callbackURL: '/dashboard' } })
                .catch((error) => {
                    console.error(
                        JSON.stringify({
                            level: 'error',
                            event: 'verification_email_request_failed',
                            message: error instanceof Error ? error.message : 'Unknown error',
                        })
                    );
                });

            res.status(201).json({
                success: true,
                data: {
                    vendor: {
                        id: created.profile.id,
                        email: created.user.email,
                        companyName: created.profile.displayName,
                        createdAt: created.profile.createdAt,
                    },
                },
            });
        } catch (error) {
            if (conflictError(error)) {
                res.status(409).json({ success: false, message: 'Email already in use' });
                return;
            }
            next(error);
        }
    }

    /** Sign in through Better Auth and transparently rehash a migrated bcrypt credential. */
    static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = normalizeEmail(req.body.email);
            const { headers, response } = await auth.api.signInEmail({
                returnHeaders: true,
                body: { email, password: req.body.password },
                headers: fromNodeHeaders(req.headers),
            });
            applyBetterAuthHeaders(res, headers);

            const twoFactorResponse = response as typeof response & {
                twoFactorRedirect?: boolean;
                twoFactorMethods?: string[];
            };
            if (twoFactorResponse.twoFactorRedirect) {
                res.status(200).json({
                    success: true,
                    data: {
                        twoFactorRequired: true,
                        twoFactorMethods: twoFactorResponse.twoFactorMethods,
                    },
                });
                return;
            }

            const signedInUser = response as typeof response & {
                user?: { id?: string; name?: string; email?: string; emailVerified?: boolean };
            };
            if (!signedInUser.user?.id) {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
                return;
            }

            const credential = await prisma.account.findFirst({
                where: {
                    userId: signedInUser.user.id,
                    issuer: 'local:credential',
                    providerId: 'credential',
                },
                select: { id: true, password: true },
            });
            if (credential?.password && isLegacyBcryptHash(credential.password)) {
                await prisma.account.update({
                    where: { id: credential.id },
                    data: { password: await hashPassword(req.body.password) },
                });
            }

            res.status(200).json({ success: true, data: { user: signedInUser.user } });
        } catch (error) {
            if (isAPIError(error)) {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
                return;
            }
            next(error);
        }
    }

    static async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { headers } = await auth.api.signOut({
                returnHeaders: true,
                headers: fromNodeHeaders(req.headers),
            });
            applyBetterAuthHeaders(res, headers);
            res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await auth.api.requestPasswordReset({
                body: { email: normalizeEmail(req.body.email), redirectTo: '/reset-password' },
                headers: fromNodeHeaders(req.headers),
            });
            res.status(200).json({
                success: true,
                message: 'If the email exists, a reset link has been sent.',
            });
        } catch (error) {
            if (isAPIError(error)) {
                res.status(200).json({
                    success: true,
                    message: 'If the email exists, a reset link has been sent.',
                });
                return;
            }
            next(error);
        }
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await auth.api.resetPassword({
                body: { token: req.body.token, newPassword: req.body.password },
                headers: fromNodeHeaders(req.headers),
            });
            res.status(200).json({
                success: true,
                message: 'Password has been reset successfully.',
            });
        } catch (error) {
            if (isAPIError(error)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token',
                });
                return;
            }
            next(error);
        }
    }

    static async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const [user, profile] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: req.userId! },
                    select: { email: true },
                }),
                prisma.vendorProfile.findFirst({
                    where: { id: req.vendorProfileId!, deletedAt: null },
                    select: { id: true, displayName: true, createdAt: true, updatedAt: true },
                }),
            ]);

            if (!user || !profile) {
                res.status(404).json({ success: false, message: 'Vendor Profile not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    id: profile.id,
                    email: user.email,
                    companyName: profile.displayName,
                    createdAt: profile.createdAt,
                    updatedAt: profile.updatedAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
