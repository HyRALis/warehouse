import { Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '@inventory-system/database';
import { auth } from '../auth';
import { AuthRequest } from '../middleware/auth';
import { applyBetterAuthHeaders } from '../services/better-auth-response.service';
import { VENDOR_PORTAL_KEY } from '../services/vendor-profile.service';

const isOwner = (role: string | undefined): boolean =>
    role
        ?.split(',')
        .map((value) => value.trim())
        .includes('owner') ?? false;

const requireOwner = (req: AuthRequest, res: Response): boolean => {
    if (isOwner(req.memberRole) && req.userId && req.organizationId && req.vendorProfileId) {
        return false;
    }
    res.status(403).json({
        success: false,
        code: 'OWNER_REQUIRED',
        message: 'Only an Organization Owner can change or deactivate the Vendor Profile',
    });
    return true;
};

export class VendorController {
    /** Compatibility endpoint backed only by User, Organization, and Vendor Profile records. */
    static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (requireOwner(req, res)) return;
            const companyName = req.body.companyName?.trim();
            const email = req.body.email?.trim().toLowerCase();

            if (email) {
                const existingUser = await prisma.user.findFirst({
                    where: { email, id: { not: req.userId! } },
                    select: { id: true },
                });
                if (existingUser) {
                    res.status(409).json({ success: false, message: 'Email already in use' });
                    return;
                }
            }

            const updated = await prisma.$transaction(async (transaction) => {
                const user = await transaction.user.update({
                    where: { id: req.userId! },
                    data: {
                        ...(companyName && { name: companyName }),
                        ...(email && { email, emailVerified: false }),
                    },
                    select: { email: true },
                });
                if (companyName) {
                    await transaction.organization.update({
                        where: { id: req.organizationId! },
                        data: { name: companyName },
                    });
                }
                const profile = await transaction.vendorProfile.update({
                    where: { id: req.vendorProfileId! },
                    data: { ...(companyName && { displayName: companyName }) },
                    select: { id: true, displayName: true, createdAt: true, updatedAt: true },
                });

                return {
                    id: profile.id,
                    email: user.email,
                    companyName: profile.displayName,
                    createdAt: profile.createdAt,
                    updatedAt: profile.updatedAt,
                };
            });

            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    /** Deactivate this Organization's Vendor Portal without deleting a multi-organization User. */
    static async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (requireOwner(req, res)) return;

            const { headers } = await auth.api.signOut({
                returnHeaders: true,
                headers: fromNodeHeaders(req.headers),
            });
            applyBetterAuthHeaders(res, headers);

            const deactivatedAt = new Date();
            await prisma.$transaction(async (transaction) => {
                await transaction.session.deleteMany({
                    where: { activeOrganizationId: req.organizationId! },
                });
                await transaction.verification.deleteMany({ where: { value: req.userId! } });
                await transaction.vendorProfile.update({
                    where: { id: req.vendorProfileId! },
                    data: { deletedAt: deactivatedAt },
                });
                await transaction.organizationPortalSubscription.update({
                    where: {
                        organizationId_portalKey: {
                            organizationId: req.organizationId!,
                            portalKey: VENDOR_PORTAL_KEY,
                        },
                    },
                    data: { status: 'CANCELLED', endsAt: deactivatedAt },
                });
                await transaction.memberPortalAccess.updateMany({
                    where: {
                        portalKey: VENDOR_PORTAL_KEY,
                        member: { organizationId: req.organizationId! },
                    },
                    data: { enabled: false, updatedByUserId: req.userId! },
                });
            });

            res.status(200).json({
                success: true,
                message: 'Vendor Portal access deactivated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
