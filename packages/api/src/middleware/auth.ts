import { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '@inventory-system/database';
import { auth } from '../auth';

export interface AuthRequest extends Request {
    userId?: string;
    vendorId?: string;
    organizationId?: string;
    sessionId?: string;
    requestId?: string;
}

const authenticationError = (
    req: AuthRequest,
    res: Response,
    code: 'UNAUTHORIZED' | 'INVALID_SESSION' | 'VENDOR_CONTEXT_REQUIRED',
    message: string,
    statusCode: 401 | 403
): void => {
    res.status(statusCode).json({ message, code, statusCode, requestId: req.requestId });
};

/**
 * Resolve the database-backed Better Auth session and attach the transitional legacy Vendor
 * context used by catalog controllers. Member/profile authorization replaces this mapping in
 * the following entitlement migration.
 */
export const verifyAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        if (!session) {
            authenticationError(req, res, 'UNAUTHORIZED', 'Unauthorized', 401);
            return;
        }

        const identity = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                legacyVendorId: true,
                legacyVendor: { select: { deletedAt: true } },
            },
        });

        if (!identity || identity.legacyVendor?.deletedAt) {
            authenticationError(req, res, 'INVALID_SESSION', 'Invalid session', 401);
            return;
        }

        if (!identity.legacyVendorId) {
            authenticationError(
                req,
                res,
                'VENDOR_CONTEXT_REQUIRED',
                'Vendor access is not available for this member yet',
                403
            );
            return;
        }

        req.userId = session.user.id;
        req.vendorId = identity.legacyVendorId;
        req.organizationId = session.session.activeOrganizationId ?? undefined;
        req.sessionId = session.session.id;
        next();
    } catch {
        authenticationError(req, res, 'INVALID_SESSION', 'Invalid session', 401);
    }
};
