import { NextFunction, Response } from 'express';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';
import { VENDOR_PORTAL_KEY } from '../services/vendor-profile.service';

const hasOwnerRole = (role: string | undefined): boolean =>
    role
        ?.split(',')
        .map((value) => value.trim())
        .includes('owner') ?? false;

const ownerRequired = (req: AuthRequest, res: Response): boolean => {
    if (hasOwnerRole(req.memberRole)) return false;
    res.status(403).json({
        success: false,
        code: 'OWNER_REQUIRED',
        message: 'Only an Organization Owner can perform this action',
        requestId: req.requestId,
    });
    return true;
};

export class PlatformController {
    static async vendorProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const profile = await prisma.vendorProfile.findUnique({
                where: { id: req.vendorProfileId! },
                select: {
                    id: true,
                    organizationId: true,
                    profileKey: true,
                    displayName: true,
                    description: true,
                    websiteUrl: true,
                    logoUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!profile) {
                res.status(404).json({ success: false, code: 'VENDOR_PROFILE_NOT_FOUND' });
                return;
            }
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    static async updateVendorProfile(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (ownerRequired(req, res)) return;

            const profile = await prisma.$transaction(async (transaction) => {
                const profile = await transaction.vendorProfile.update({
                    where: { id: req.vendorProfileId! },
                    data: {
                        ...(req.body.displayName !== undefined && {
                            displayName: req.body.displayName,
                        }),
                        ...(req.body.description !== undefined && {
                            description: req.body.description,
                        }),
                        ...(req.body.websiteUrl !== undefined && {
                            websiteUrl: req.body.websiteUrl,
                        }),
                        ...(req.body.logoUrl !== undefined && { logoUrl: req.body.logoUrl }),
                    },
                    select: {
                        id: true,
                        organizationId: true,
                        profileKey: true,
                        displayName: true,
                        description: true,
                        websiteUrl: true,
                        logoUrl: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                if (req.body.displayName !== undefined) {
                    await transaction.vendor.update({
                        where: { id: req.vendorId! },
                        data: { companyName: req.body.displayName },
                    });
                }
                return profile;
            });
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    static async context(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const [organization, subscription, explicitAccess, vendorProfile] = await Promise.all([
                prisma.organization.findUnique({
                    where: { id: req.organizationId! },
                    select: { id: true, name: true, slug: true, logo: true },
                }),
                prisma.organizationPortalSubscription.findUnique({
                    where: {
                        organizationId_portalKey: {
                            organizationId: req.organizationId!,
                            portalKey: VENDOR_PORTAL_KEY,
                        },
                    },
                    select: {
                        status: true,
                        startsAt: true,
                        endsAt: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                }),
                prisma.memberPortalAccess.findUnique({
                    where: {
                        memberId_portalKey: {
                            memberId: req.memberId!,
                            portalKey: VENDOR_PORTAL_KEY,
                        },
                    },
                    select: { enabled: true, createdAt: true, updatedAt: true },
                }),
                prisma.vendorProfile.findUnique({
                    where: {
                        organizationId_profileKey: {
                            organizationId: req.organizationId!,
                            profileKey: 'primary',
                        },
                    },
                    select: {
                        id: true,
                        profileKey: true,
                        displayName: true,
                        description: true,
                        websiteUrl: true,
                        logoUrl: true,
                        deletedAt: true,
                    },
                }),
            ]);

            if (!organization) {
                res.status(404).json({ success: false, code: 'ORGANIZATION_NOT_FOUND' });
                return;
            }

            const owner = hasOwnerRole(req.memberRole);
            const now = new Date();
            const subscriptionActive = Boolean(
                subscription &&
                subscription.status === 'ACTIVE' &&
                subscription.startsAt <= now &&
                (!subscription.endsAt || subscription.endsAt > now)
            );

            res.status(200).json({
                success: true,
                data: {
                    organization,
                    membership: {
                        id: req.memberId,
                        role: req.memberRole,
                        isOwner: owner,
                    },
                    portal: {
                        key: VENDOR_PORTAL_KEY,
                        subscription: subscription
                            ? { ...subscription, active: subscriptionActive }
                            : null,
                        access: {
                            granted: owner || explicitAccess?.enabled === true,
                            implicit: owner,
                            record: explicitAccess,
                        },
                    },
                    vendorProfile:
                        vendorProfile && !vendorProfile.deletedAt
                            ? {
                                  id: vendorProfile.id,
                                  profileKey: vendorProfile.profileKey,
                                  displayName: vendorProfile.displayName,
                                  description: vendorProfile.description,
                                  websiteUrl: vendorProfile.websiteUrl,
                                  logoUrl: vendorProfile.logoUrl,
                              }
                            : null,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    static async listMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (ownerRequired(req, res)) return;

            const members = await prisma.member.findMany({
                where: { organizationId: req.organizationId! },
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                    portalAccess: {
                        where: { portalKey: VENDOR_PORTAL_KEY },
                        select: { enabled: true, createdAt: true, updatedAt: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
            });

            res.status(200).json({
                success: true,
                data: members.map((member) => {
                    const owner = hasOwnerRole(member.role);
                    return {
                        id: member.id,
                        role: member.role,
                        createdAt: member.createdAt,
                        user: member.user,
                        vendorPortalAccess: {
                            granted: owner || member.portalAccess[0]?.enabled === true,
                            implicit: owner,
                            record: member.portalAccess[0] ?? null,
                        },
                    };
                }),
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateMemberAccess(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (ownerRequired(req, res)) return;

            const target = await prisma.member.findFirst({
                where: { id: req.params.memberId, organizationId: req.organizationId! },
                select: { id: true, role: true },
            });
            if (!target) {
                res.status(404).json({
                    success: false,
                    code: 'MEMBER_NOT_FOUND',
                    message: 'Member not found',
                });
                return;
            }
            if (hasOwnerRole(target.role)) {
                res.status(409).json({
                    success: false,
                    code: 'OWNER_ACCESS_IMPLICIT',
                    message:
                        'Owners always have access to active Organization portal subscriptions',
                });
                return;
            }

            const subscription = await prisma.organizationPortalSubscription.findUnique({
                where: {
                    organizationId_portalKey: {
                        organizationId: req.organizationId!,
                        portalKey: VENDOR_PORTAL_KEY,
                    },
                },
                select: { status: true, startsAt: true, endsAt: true },
            });
            const now = new Date();
            if (
                !subscription ||
                subscription.status !== 'ACTIVE' ||
                subscription.startsAt > now ||
                (subscription.endsAt && subscription.endsAt <= now)
            ) {
                res.status(409).json({
                    success: false,
                    code: 'VENDOR_SUBSCRIPTION_INACTIVE',
                    message: 'Member access cannot be changed without an active subscription',
                });
                return;
            }

            const access = await prisma.memberPortalAccess.upsert({
                where: {
                    memberId_portalKey: {
                        memberId: target.id,
                        portalKey: VENDOR_PORTAL_KEY,
                    },
                },
                create: {
                    memberId: target.id,
                    portalKey: VENDOR_PORTAL_KEY,
                    enabled: req.body.enabled,
                    grantedByUserId: req.userId!,
                    updatedByUserId: req.userId!,
                },
                update: {
                    enabled: req.body.enabled,
                    updatedByUserId: req.userId!,
                },
                select: { enabled: true, createdAt: true, updatedAt: true },
            });

            res.status(200).json({
                success: true,
                data: {
                    memberId: target.id,
                    vendorPortalAccess: {
                        granted: access.enabled,
                        implicit: false,
                        record: access,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
