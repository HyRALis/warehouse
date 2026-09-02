import { prismaAdapter } from '@better-auth/prisma-adapter';
import prisma from '@inventory-system/database';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { organization, twoFactor } from 'better-auth/plugins';
import { config } from './config';
import { queueAuthEmail } from './services/auth-email.service';
import { hashPassword, verifyPassword } from './services/password.service';

const portalOrigin = config.corsOrigins[0] ?? 'http://localhost:3000';

const hasRole = (role: string | string[] | null | undefined, expected: string): boolean =>
    (Array.isArray(role) ? role : role?.split(',') ?? []).includes(expected);

const ensureSupportedRole = (role: string | string[] | null | undefined): void => {
    const roles = Array.isArray(role) ? role : role?.split(',') ?? [];
    if (roles.length === 0 || roles.some((value) => value !== 'owner' && value !== 'member')) {
        throw APIError.from('BAD_REQUEST', {
            code: 'UNSUPPORTED_ORGANIZATION_ROLE',
            message: 'Only Owner and Member roles are supported in the Vendor Portal',
        });
    }
};

const ensureOwnerCanChange = async (member: { role: string; organizationId: string }) => {
    if (!hasRole(member.role, 'owner')) return;

    const ownerCount = await prisma.member.count({
        where: { organizationId: member.organizationId, role: { contains: 'owner' } },
    });
    if (ownerCount <= 1) {
        throw APIError.from('BAD_REQUEST', {
            code: 'LAST_OWNER_REQUIRED',
            message: 'The last Owner cannot be removed or demoted',
        });
    }
};

export const auth = betterAuth({
    appName: 'OmniStock Vendor Portal',
    baseURL: config.betterAuthUrl,
    basePath: '/api/auth',
    secret: config.betterAuthSecret,
    trustedOrigins: config.corsOrigins,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    advanced: {
        database: { joins: true },
        useSecureCookies: config.nodeEnv === 'production',
        ...(config.authClientIpHeader
            ? { ipAddress: { ipAddressHeaders: [config.authClientIpHeader] } }
            : {}),
    },
    user: {
        validateUserInfo: async ({ user, source }) => {
            if (source.action !== 'create-user' || source.method !== 'email-password') return;

            const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
            const invitation = email
                ? await prisma.invitation.findFirst({
                      where: {
                          email,
                          status: 'pending',
                          expiresAt: { gt: new Date() },
                      },
                      select: { id: true },
                  })
                : null;

            if (!invitation) {
                return {
                    error: 'INVITATION_REQUIRED',
                    errorDescription: 'A valid organization invitation is required',
                };
            }
        },
        additionalFields: {
            legacyVendorId: {
                type: 'string',
                required: false,
                input: false,
                returned: false,
            },
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
        enabled: true,
        // Compatibility registration creates the complete owner/organization graph itself.
        // Native signup remains available only to users with a pending organization invite.
        disableSignUp: false,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        requireEmailVerification: false,
        revokeSessionsOnPasswordReset: true,
        password: { hash: hashPassword, verify: verifyPassword },
        sendResetPassword: async ({ user, url }) => {
            queueAuthEmail({ kind: 'password-reset', to: user.email, url });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: false,
        expiresIn: 60 * 60,
        sendVerificationEmail: async ({ user, url }) => {
            queueAuthEmail({ kind: 'email-verification', to: user.email, url });
        },
    },
    databaseHooks: {
        session: {
            create: {
                before: async (session) => {
                    const identity = await prisma.user.findUnique({
                        where: { id: session.userId },
                        select: {
                            legacyVendor: { select: { deletedAt: true } },
                            members: {
                                orderBy: { createdAt: 'asc' },
                                take: 1,
                                select: { organizationId: true },
                            },
                        },
                    });

                    if (!identity || identity.legacyVendor?.deletedAt) {
                        throw APIError.from('FORBIDDEN', {
                            code: 'ACCOUNT_INACTIVE',
                            message: 'This account is not active',
                        });
                    }

                    return {
                        data: {
                            ...session,
                            activeOrganizationId: identity.members[0]?.organizationId ?? null,
                        },
                    };
                },
            },
        },
    },
    plugins: [
        organization({
            allowUserToCreateOrganization: false,
            creatorRole: 'owner',
            disableOrganizationDeletion: true,
            async sendInvitationEmail(data) {
                const url = `${portalOrigin}/accept-invitation?invitationId=${encodeURIComponent(
                    data.id
                )}`;
                queueAuthEmail({
                    kind: 'organization-invitation',
                    to: data.email,
                    url,
                    organizationName: data.organization.name,
                    invitedBy: data.inviter.user.name,
                });
            },
            organizationHooks: {
                beforeAddMember: async ({ member }) => {
                    ensureSupportedRole(member.role);
                },
                beforeCreateInvitation: async ({ invitation }) => {
                    ensureSupportedRole(invitation.role ?? 'member');
                },
                beforeRemoveMember: async ({ member }) => {
                    await ensureOwnerCanChange(member);
                },
                beforeUpdateMemberRole: async ({ member, newRole }) => {
                    ensureSupportedRole(newRole);
                    if (hasRole(member.role, 'owner') && !hasRole(newRole, 'owner')) {
                        await ensureOwnerCanChange(member);
                    }
                    return { data: { role: Array.isArray(newRole) ? newRole.join(',') : newRole } };
                },
            },
        }),
        twoFactor({
            issuer: 'OmniStock Vendor Portal',
            backupCodeOptions: { amount: 10, length: 10 },
            accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 15 * 60 },
        }),
    ],
    rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
    },
});

export type Auth = typeof auth;
