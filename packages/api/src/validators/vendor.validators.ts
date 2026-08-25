import { z } from 'zod';

export const updateVendorSchema = z.object({
    body: z
        .object({
            companyName: z.string().trim().min(1).max(200).optional(),
            email: z.string().trim().email().optional(),
        })
        .refine((body) => body.companyName !== undefined || body.email !== undefined, {
            message: 'At least one profile field is required',
        }),
});
