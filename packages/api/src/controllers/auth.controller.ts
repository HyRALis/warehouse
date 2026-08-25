import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';
import {
    clearSessionCookie,
    setSessionCookie,
    signSession,
} from '../services/session.service';

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

const hashResetToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export class AuthController {
    /**
     * Register a new vendor
     */
    static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password, companyName } = req.body;

            const existingVendor = await prisma.vendor.findUnique({ where: { email } });
            if (existingVendor) {
                res.status(409).json({ success: false, message: 'Email already in use' });
                return;
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const vendor = await prisma.vendor.create({
                data: {
                    email,
                    passwordHash,
                    companyName,
                },
            });

            const token = signSession(vendor.id, vendor.tokenVersion);
            setSessionCookie(res, token);

            res.status(201).json({
                success: true,
                data: {
                    vendor: publicVendor(vendor),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login a vendor
     */
    static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const vendor = await prisma.vendor.findFirst({
                where: { email, deletedAt: null },
            });

            if (!vendor) {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
                return;
            }

            const isPasswordValid = await bcrypt.compare(password, vendor.passwordHash);

            if (!isPasswordValid) {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
                return;
            }

            const token = signSession(vendor.id, vendor.tokenVersion);
            setSessionCookie(res, token);

            res.status(200).json({
                success: true,
                data: {
                    vendor: publicVendor(vendor),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logout a vendor
     */
    static async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await prisma.vendor.update({
                where: { id: req.vendorId! },
                data: { tokenVersion: { increment: 1 } },
            });
            clearSessionCookie(res);
            res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Request password reset
     */
    static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email } = req.body;
            const vendor = await prisma.vendor.findFirst({
                where: { email, deletedAt: null },
                select: { id: true },
            });

            let resetToken: string | undefined;
            if (vendor) {
                resetToken = crypto.randomBytes(32).toString('hex');
                await prisma.vendor.update({
                    where: { id: vendor.id },
                    data: {
                        passwordResetTokenHash: hashResetToken(resetToken),
                        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    },
                });
            }

            res.status(200).json({
                success: true,
                message: 'If the email exists, a reset link has been sent.',
                ...(config.nodeEnv !== 'production' && resetToken ? { resetToken } : {}),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reset password
     */
    static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token, password } = req.body;
            const vendor = await prisma.vendor.findFirst({
                where: {
                    passwordResetTokenHash: hashResetToken(token),
                    passwordResetExpiresAt: { gt: new Date() },
                    deletedAt: null,
                },
                select: { id: true },
            });

            if (!vendor) {
                res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
                return;
            }

            const passwordHash = await bcrypt.hash(password, 12);
            await prisma.vendor.update({
                where: { id: vendor.id },
                data: {
                    passwordHash,
                    passwordResetTokenHash: null,
                    passwordResetExpiresAt: null,
                    tokenVersion: { increment: 1 },
                },
            });
            clearSessionCookie(res);
            res.status(200).json({
                success: true,
                message: 'Password has been reset successfully.',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current vendor profile
     */
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
