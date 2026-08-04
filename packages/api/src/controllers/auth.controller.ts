import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';

const loginAttempts = new Map<string, { attempts: number, lockUntil: number }>();

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

      const passwordHash = await bcrypt.hash(password, 10);

      const vendor = await prisma.vendor.create({
        data: {
          email,
          passwordHash,
          companyName,
        }
      });

      const token = jwt.sign(
        { id: vendor.id },
        process.env.JWT_SECRET || 'super_secret_development_key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          vendor: {
            id: vendor.id,
            email: vendor.email,
            companyName: vendor.companyName,
            createdAt: vendor.createdAt,
          }
        }
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
      const attempt = loginAttempts.get(email);

      if (attempt && attempt.lockUntil > Date.now()) {
        res.status(401).json({ success: false, message: 'Account locked. Try again later.' });
        return;
      }

      const vendor = await prisma.vendor.findFirst({
        where: { email, deletedAt: null }
      });

      if (!vendor) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, vendor.passwordHash);

      if (!isPasswordValid) {
        const attempts = (attempt?.attempts || 0) + 1;
        if (attempts >= 5) {
          loginAttempts.set(email, { attempts, lockUntil: Date.now() + 15 * 60 * 1000 });
          res.status(401).json({ success: false, message: 'Account locked. Try again later.' });
        } else {
          loginAttempts.set(email, { attempts, lockUntil: 0 });
          res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        return;
      }

      loginAttempts.delete(email);

      const token = jwt.sign(
        { id: vendor.id },
        process.env.JWT_SECRET || 'super_secret_development_key',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        data: {
          token,
          vendor: {
            id: vendor.id,
            email: vendor.email,
            companyName: vendor.companyName,
            createdAt: vendor.createdAt,
          }
        }
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
      console.log(`Password reset requested for: ${email}`);
      // TODO: implement email provider
      res.status(200).json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Password reset executed');
      // TODO: implement token verification and password update
      res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
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
          updatedAt: true
        }
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
