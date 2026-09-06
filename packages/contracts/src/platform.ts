import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema } from './common';

export const portalSubscriptionStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']);

export const portalSubscriptionContextSchema = z.object({
    status: portalSubscriptionStatusSchema,
    startsAt: isoDateSchema,
    endsAt: isoDateSchema.nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    active: z.boolean(),
});

export const memberPortalAccessContextSchema = z.object({
    granted: z.boolean(),
    /** Owners receive access implicitly; non-owners require an explicit record. */
    implicit: z.boolean(),
    record: z
        .object({
            enabled: z.boolean(),
            createdAt: isoDateSchema,
            updatedAt: isoDateSchema,
        })
        .nullable(),
});

export const vendorProfileContextSchema = z.object({
    id: z.string(),
    profileKey: z.literal('primary'),
    displayName: z.string(),
    description: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    logoUrl: z.string().nullable(),
});

export const updateVendorProfileRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        websiteUrl: z.string().trim().url().nullable().optional(),
        logoUrl: z.string().trim().url().nullable().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        message: 'At least one profile field is required',
    });

export const vendorPlatformContextSchema = z.object({
    organization: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        logo: z.string().nullable(),
    }),
    membership: z.object({
        id: z.string(),
        role: z.string(),
        isOwner: z.boolean(),
    }),
    portal: z.object({
        key: z.literal('vendor'),
        subscription: portalSubscriptionContextSchema.nullable(),
        access: memberPortalAccessContextSchema,
    }),
    vendorProfile: vendorProfileContextSchema.nullable(),
});

export const vendorMemberAccessSchema = z.object({
    id: z.string(),
    role: z.string(),
    createdAt: isoDateSchema,
    user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        image: z.string().nullable(),
    }),
    vendorPortalAccess: memberPortalAccessContextSchema,
});

export const vendorPlatformContextApiResponseSchema = apiSuccessSchema(
    vendorPlatformContextSchema
);
export const vendorProfileApiResponseSchema = apiSuccessSchema(vendorProfileContextSchema);
export const vendorMembersApiResponseSchema = apiSuccessSchema(z.array(vendorMemberAccessSchema));

/** Readable before sign-in, so it carries no member or organization detail beyond the invite. */
export const publicInvitationSummarySchema = z.object({
    id: z.string(),
    email: z.string().email(),
    organizationId: z.string(),
    organizationName: z.string(),
    inviterEmail: z.string().email(),
    role: z.string(),
    status: z.string(),
    expiresAt: isoDateSchema,
});

export const publicInvitationSummaryApiResponseSchema = apiSuccessSchema(
    publicInvitationSummarySchema
);

export const updateMemberPortalAccessRequestSchema = z.object({ enabled: z.boolean() });

export const memberPortalAccessResultSchema = z.object({
    memberId: z.string(),
    vendorPortalAccess: memberPortalAccessContextSchema,
});

export const memberPortalAccessApiResponseSchema = apiSuccessSchema(
    memberPortalAccessResultSchema
);

export type PortalSubscriptionStatus = z.infer<typeof portalSubscriptionStatusSchema>;
export type PortalSubscriptionContext = z.infer<typeof portalSubscriptionContextSchema>;
export type MemberPortalAccessContext = z.infer<typeof memberPortalAccessContextSchema>;
export type VendorProfileContext = z.infer<typeof vendorProfileContextSchema>;
export type UpdateVendorProfileRequest = z.infer<typeof updateVendorProfileRequestSchema>;
export type VendorPlatformContext = z.infer<typeof vendorPlatformContextSchema>;
export type VendorMemberAccessResponse = z.infer<typeof vendorMemberAccessSchema>;
export type PublicInvitationSummary = z.infer<typeof publicInvitationSummarySchema>;
export type UpdateMemberPortalAccessRequest = z.infer<
    typeof updateMemberPortalAccessRequestSchema
>;
export type MemberPortalAccessResult = z.infer<typeof memberPortalAccessResultSchema>;
