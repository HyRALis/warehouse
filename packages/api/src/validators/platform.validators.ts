import { z } from 'zod';

export const updateMemberPortalAccessSchema = z.object({
    params: z.object({ memberId: z.string().min(1).max(255) }),
    body: z.object({ enabled: z.boolean() }),
});

export const updateVendorProfileSchema = z.object({
    body: z
        .object({
            displayName: z.string().trim().min(1).max(200).optional(),
            description: z.string().trim().max(5000).nullable().optional(),
            websiteUrl: z.string().url().max(2048).nullable().optional(),
            logoUrl: z.string().url().max(2048).nullable().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});
