import { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import prisma from '@inventory-system/database';
import { auth } from '../auth';

export interface AuthRequest extends Request {
    userId?: string;
    vendorProfileId?: string;
    organizationId?: string;
    memberId?: string;
    memberRole?: string;
    sessionId?: string;
    requestId?: string;
}

const authenticationError = (
    req: AuthRequest,
    res: Response,
    code:
        | 'UNAUTHORIZED'
        | 'INVALID_SESSION'
        | 'ORGANIZATION_CONTEXT_REQUIRED'
        | 'VENDOR_SUBSCRIPTION_INACTIVE'
        | 'VENDOR_PORTAL_ACCESS_DENIED'
        | 'VENDOR_PROFILE_REQUIRED'
        | 'VENDOR_PROFILE_ACCESS_DENIED',
    message: string,
    statusCode: 401 | 403
): void => {
    res.status(statusCode).json({ message, code, statusCode, requestId: req.requestId });
};

/**
 * Resolve the database-backed Better Auth session and active Organization membership.
 */
const resolveSessionContext = async (req: AuthRequest) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return null;

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
        return { session, membership: null };
    }

    const membership = await prisma.member.findUnique({
        where: {
            organizationId_userId: {
                organizationId,
                userId: session.user.id,
            },
        },
        select: { id: true, organizationId: true, role: true },
    });

    return { session, membership };
};

const attachSessionContext = (
    req: AuthRequest,
    context: NonNullable<Awaited<ReturnType<typeof resolveSessionContext>>>
): void => {
    req.userId = context.session.user.id;
    req.sessionId = context.session.session.id;
    req.organizationId = context.membership?.organizationId;
    req.memberId = context.membership?.id;
    req.memberRole = context.membership?.role;
};

export const verifySession = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const context = await resolveSessionContext(req);
        if (!context) {
            authenticationError(req, res, 'UNAUTHORIZED', 'Unauthorized', 401);
            return;
        }
        if (!context.membership) {
            authenticationError(
                req,
                res,
                'ORGANIZATION_CONTEXT_REQUIRED',
                'An active Organization membership is required',
                403
            );
            return;
        }
        attachSessionContext(req, context);
        next();
    } catch (error) {
        next(error);
    }
};

/** Require the active Organization's Vendor Portal entitlement and primary Vendor Profile. */
export const verifyAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const context = await resolveSessionContext(req);
        if (!context) {
            authenticationError(req, res, 'UNAUTHORIZED', 'Unauthorized', 401);
            return;
        }
        if (!context.membership) {
            authenticationError(
                req,
                res,
                'ORGANIZATION_CONTEXT_REQUIRED',
                'An active Organization membership is required',
                403
            );
            return;
        }

        const now = new Date();
        const [subscription, explicitAccess, vendorProfile] = await Promise.all([
            prisma.organizationPortalSubscription.findUnique({
                where: {
                    organizationId_portalKey: {
                        organizationId: context.membership.organizationId,
                        portalKey: 'vendor',
                    },
                },
                select: { status: true, startsAt: true, endsAt: true },
            }),
            prisma.memberPortalAccess.findUnique({
                where: {
                    memberId_portalKey: {
                        memberId: context.membership.id,
                        portalKey: 'vendor',
                    },
                },
                select: { enabled: true },
            }),
            prisma.vendorProfile.findUnique({
                where: {
                    organizationId_profileKey: {
                        organizationId: context.membership.organizationId,
                        profileKey: 'primary',
                    },
                },
                select: { id: true, deletedAt: true },
            }),
        ]);

        if (
            !subscription ||
            subscription.status !== 'ACTIVE' ||
            subscription.startsAt > now ||
            (subscription.endsAt && subscription.endsAt <= now)
        ) {
            authenticationError(
                req,
                res,
                'VENDOR_SUBSCRIPTION_INACTIVE',
                'The Organization does not have an active Vendor Portal subscription',
                403
            );
            return;
        }

        const owner = context.membership.role
            .split(',')
            .map((role) => role.trim())
            .includes('owner');
        if (!owner && explicitAccess?.enabled !== true) {
            authenticationError(
                req,
                res,
                'VENDOR_PORTAL_ACCESS_DENIED',
                'Vendor Portal access has not been granted to this member',
                403
            );
            return;
        }

        if (!vendorProfile || vendorProfile.deletedAt) {
            authenticationError(
                req,
                res,
                'VENDOR_PROFILE_REQUIRED',
                'The primary Vendor Profile is not available',
                403
            );
            return;
        }

        const requestedVendorProfileId = req.get('X-Vendor-Profile-Id');
        if (requestedVendorProfileId && requestedVendorProfileId !== vendorProfile.id) {
            authenticationError(
                req,
                res,
                'VENDOR_PROFILE_ACCESS_DENIED',
                'The requested Vendor Profile is not available to this Organization',
                403
            );
            return;
        }

        attachSessionContext(req, context);
        req.vendorProfileId = vendorProfile.id;
        next();
    } catch (error) {
        next(error);
    }
};
