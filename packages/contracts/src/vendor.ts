import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema } from './common';

export const vendorSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    companyName: z.string(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema.optional(),
});

export const registerVendorRequestSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    companyName: z.string().trim().min(1, 'Company name is required').max(200),
});

export const loginVendorRequestSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const updateVendorRequestSchema = z
    .object({
        companyName: z.string().trim().min(1).max(200).optional(),
        email: z.string().trim().email().optional(),
    })
    .refine((value) => value.companyName !== undefined || value.email !== undefined, {
        message: 'At least one profile field is required',
    });

export const authResponseSchema = z.object({ vendor: vendorSchema });
export const authApiResponseSchema = apiSuccessSchema(authResponseSchema);
export const currentVendorApiResponseSchema = apiSuccessSchema(vendorSchema);
export const vendorApiResponseSchema = apiSuccessSchema(vendorSchema);

export type Vendor = z.infer<typeof vendorSchema>;
export type RegisterVendorRequest = z.infer<typeof registerVendorRequestSchema>;
export type LoginVendorRequest = z.infer<typeof loginVendorRequestSchema>;
export type UpdateVendorRequest = z.infer<typeof updateVendorRequestSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
