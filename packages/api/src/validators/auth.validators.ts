import { z } from 'zod';
import {
    loginVendorRequestSchema,
    registerVendorRequestSchema,
} from '@inventory-system/contracts';

export const registerSchema = z.object({
    body: registerVendorRequestSchema,
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(32),
        password: z.string().min(12),
    }),
});

export const loginSchema = z.object({
    body: loginVendorRequestSchema,
});
