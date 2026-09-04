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

const publicVendor = (vendor: {
    id: string;
    email: string;
    companyName: string;
    createdAt: Date;
}) => ({
    id: vendor.id,
    email: vendor.email,
    companyName: vendor.companyName,
    createdAt: vendor.createdAt,
});

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const conflictError = (error: unknown): boolean =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class AuthController {
    /**
     * Transitional registration contract. Identity, credential account, Organization, Owner
     * membership, and legacy Vendor context are created atomically; Better Auth then creates the
     * database-backed session returned through its native cookie.
     */
    static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = normalizeEmail(req.body.email);
            const { password, companyName } = req.body;
            const passwordHash = await hashPassword(password);
            const userId = crypto.randomUUID();
            const vendorId = crypto.randomUUID();
            const organizationId = crypto.randomUUID();
            const now = new Date();

            const vendor = await prisma.$transaction(
                async (transaction) => {
                    const createdVendor = await transaction.vendor.create({
                        data: { id: vendorId, email, passwordHash, companyName },
                    });
                    await transaction.user.create({
                        data: {
                            id: userId,
                            name: companyName,
                            email,
                            emailVerified: false,
                            legacyVendorId: vendorId,
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
                    await createVendorProfile(transaction, {
                        organizationId,
                        profileId: vendorId,
                        profileKey: 'primary',
                        displayName: companyName,
                        legacyVendorId: vendorId,
                    });
                    return createdVendor;
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
                data: { vendor: publicVendor(vendor) },
            });
        } catch (error) {
            if (conflictError(error)) {
                res.status(409).json({ success: false, message: 'Email already in use' });
                return;
            }
            next(error);
        }
    }

    /** Login through Better Auth while preserving the existing response envelope. */
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
                user?: {
                    id?: string;
                    name?: string;
                    email?: string;
                    emailVerified?: boolean;
                    image?: string | null;
                };
            };
            const identity = signedInUser.user?.id
                ? await prisma.user.findUnique({
                      where: { id: signedInUser.user.id },
                      select: {
                          legacyVendor: {
                              select: {
                                  id: true,
                                  email: true,
                                  companyName: true,
                                  createdAt: true,
                                  deletedAt: true,
                              },
                          },
                          accounts: {
                              where: { issuer: 'local:credential', providerId: 'credential' },
                              take: 1,
                              select: { id: true, password: true },
                          },
                      },
                  })
                : null;

            if (!identity || identity.legacyVendor?.deletedAt) {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
                return;
            }

            const credential = identity.accounts[0];
            if (credential && isLegacyBcryptHash(credential.password)) {
                await prisma.account.update({
                    where: { id: credential.id },
                    data: { password: await hashPassword(req.body.password) },
                });
            }

            if (!identity.legacyVendor) {
                res.status(200).json({
                    success: true,
                    data: { user: signedInUser.user },
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: { vendor: publicVendor(identity.legacyVendor) },
            });
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
                body: {
                    email: normalizeEmail(req.body.email),
                    redirectTo: '/reset-password',
                },
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
            const vendor = await prisma.vendor.findFirst({
                where: { id: req.vendorId, deletedAt: null },
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!vendor) {
                res.status(404).json({ success: false, message: 'Vendor not found' });
                return;
            }

            res.status(200).json({ success: true, data: vendor });
        } catch (error) {
            next(error);
        }
    }
}
