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

export const forgotPasswordRequestSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordRequestSchema = z.object({
    token: z.string().min(1, 'The reset link is missing its token'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
});

export const vendorSessionSchema = z.object({ vendor: vendorSchema });

/**
 * A login either completes or stops at a second-factor challenge. Both outcomes share the
 * success envelope, so the response is a union narrowed by `isTwoFactorChallenge`.
 */
export const twoFactorChallengeSchema = z.object({
    twoFactorRequired: z.literal(true),
    twoFactorMethods: z.array(z.string()).optional(),
});

export const authResponseSchema = z.union([vendorSessionSchema, twoFactorChallengeSchema]);
export const authApiResponseSchema = apiSuccessSchema(authResponseSchema);
export const currentVendorApiResponseSchema = apiSuccessSchema(vendorSchema);
export const vendorApiResponseSchema = apiSuccessSchema(vendorSchema);

export type Vendor = z.infer<typeof vendorSchema>;
export type RegisterVendorRequest = z.infer<typeof registerVendorRequestSchema>;
export type LoginVendorRequest = z.infer<typeof loginVendorRequestSchema>;
export type UpdateVendorRequest = z.infer<typeof updateVendorRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type VendorSession = z.infer<typeof vendorSessionSchema>;
export type TwoFactorChallenge = z.infer<typeof twoFactorChallengeSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const isTwoFactorChallenge = (response: AuthResponse): response is TwoFactorChallenge =>
    'twoFactorRequired' in response;
