import { Response, NextFunction } from 'express';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';

export class VendorController {
    /**
     * Update vendor profile
     */
    static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyName, email } = req.body;
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

            const updatedVendor = await prisma.vendor.update({
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

            await prisma.vendor.update({
                where: { id: vendorId },
                data: { deletedAt: new Date() },
            });

            res.status(200).json({ success: true, message: 'Account deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}
