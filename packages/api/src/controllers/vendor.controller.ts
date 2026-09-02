import { Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '@inventory-system/database';
import { auth } from '../auth';
import { AuthRequest } from '../middleware/auth';
import { applyBetterAuthHeaders } from '../services/better-auth-response.service';

const isOwner = (role: string | undefined): boolean =>
    role
        ?.split(',')
        .map((value) => value.trim())
        .includes('owner') ?? false;

const requireOwner = (req: AuthRequest, res: Response): boolean => {
    if (isOwner(req.memberRole) && req.vendorId) return false;
    res.status(403).json({
        success: false,
        code: 'OWNER_REQUIRED',
        message: 'Only an Organization Owner can change or deactivate the Vendor Profile',
    });
    return true;
};

export class VendorController {
    /**
     * Update vendor profile
     */
    static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (requireOwner(req, res)) return;
            const { companyName } = req.body;
            const email = req.body.email?.trim().toLowerCase();
            const vendorId = req.vendorId!;

            if (email) {
                const existingVendor = await prisma.vendor.findFirst({
                    where: { email, id: { not: vendorId } },
                });

                if (existingVendor) {
                    res.status(409).json({ success: false, message: 'Email already in use' });
                    return;
                }
            }

            const updatedVendor = await prisma.$transaction(async (transaction) => {
                const vendor = await transaction.vendor.update({
                    where: { id: vendorId },
                    data: {
                        ...(companyName && { companyName }),
                        ...(email && { email }),
                    },
                    select: {
                        id: true,
                        email: true,
                        companyName: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                await transaction.user.update({
                    where: { legacyVendorId: vendorId },
                    data: {
                        ...(companyName && { name: companyName }),
                        ...(email && { email, emailVerified: false }),
                    },
                });
                if (companyName) {
                    await transaction.vendorProfile.update({
                        where: { id: req.vendorProfileId! },
                        data: { displayName: companyName },
                    });
                }
                return vendor;
            });

            res.status(200).json({ success: true, data: updatedVendor });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Soft delete vendor account
     */
    static async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (requireOwner(req, res)) return;
            const vendorId = req.vendorId!;

            const { headers } = await auth.api.signOut({
                returnHeaders: true,
                headers: fromNodeHeaders(req.headers),
            });
            applyBetterAuthHeaders(res, headers);

            await prisma.$transaction(async (transaction) => {
                const identity = await transaction.user.findUniqueOrThrow({
                    where: { legacyVendorId: vendorId },
                    select: { id: true },
                });
                await transaction.session.deleteMany({ where: { userId: identity.id } });
                await transaction.verification.deleteMany({
                    // Better Auth reset records store the target User ID as their value.
                    where: { value: identity.id },
                });
                await transaction.vendor.update({
                    where: { id: vendorId },
                    data: { deletedAt: new Date(), tokenVersion: { increment: 1 } },
                });
                await transaction.vendorProfile.updateMany({
                    where: { legacyVendorId: vendorId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            });

            res.status(200).json({ success: true, message: 'Account deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
