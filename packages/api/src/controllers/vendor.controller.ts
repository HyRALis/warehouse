import { Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '@inventory-system/database';
import { auth } from '../auth';
import { AuthRequest } from '../middleware/auth';
import { applyBetterAuthHeaders } from '../services/better-auth-response.service';

export class VendorController {
    /**
     * Update vendor profile
     */
    static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
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
            });

            res.status(200).json({ success: true, message: 'Account deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
