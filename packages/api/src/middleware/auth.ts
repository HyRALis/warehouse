import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    vendorId?: string;
}

/**
 * Middleware to verify JWT and attach vendorId to request
 */
export const verifyAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 });
        return;
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'super_secret_development_key'
        ) as { id: string };
        req.vendorId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token', code: 'INVALID_TOKEN', statusCode: 401 });
    }
};
