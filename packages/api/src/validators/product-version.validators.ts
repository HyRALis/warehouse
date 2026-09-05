import { z } from 'zod';
import {
    createProductVersionRequestSchema,
    updateProductVersionRequestSchema,
} from '@inventory-system/contracts';

const versionParams = z.object({
    productId: z.string().uuid(),
    versionId: z.string().uuid().optional(),
});

export const createProductVersionSchema = z.object({
    params: versionParams.pick({ productId: true }),
    body: createProductVersionRequestSchema,
});

export const updateProductVersionSchema = z.object({
    params: versionParams.required(),
    body: updateProductVersionRequestSchema,
});

export const productVersionParamsSchema = z.object({
    params: versionParams.required(),
});

export const compareProductVersionsSchema = z.object({
    params: versionParams.pick({ productId: true }),
    query: z.object({
        leftId: z.string().uuid(),
        rightId: z.string().uuid(),
    }),
});
