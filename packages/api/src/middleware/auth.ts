import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@inventory-system/database';
import { config } from '../config';
import { getSessionToken, SessionPayload } from '../services/session.service';

export interface AuthRequest extends Request {
    vendorId?: string;
    requestId?: string;
}

/**
 * Middleware to verify JWT and attach vendorId to request
 */
export const verifyAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const token = getSessionToken(req);

    if (!token) {
        res.status(401).json({
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
            statusCode: 401,
            requestId: req.requestId,
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as SessionPayload;
        const vendor = await prisma.vendor.findFirst({
            where: {
                id: decoded.id,
                tokenVersion: decoded.tokenVersion,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!vendor) {
            res.status(401).json({
                message: 'Invalid session',
                code: 'INVALID_SESSION',
                statusCode: 401,
                requestId: req.requestId,
            });
            return;
        }

        req.vendorId = decoded.id;
        next();
    } catch {
        res.status(401).json({
            message: 'Invalid session',
            code: 'INVALID_SESSION',
            statusCode: 401,
            requestId: req.requestId,
        });
    }
};
