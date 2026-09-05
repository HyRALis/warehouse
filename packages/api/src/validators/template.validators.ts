import { z } from 'zod';
import {
    createTemplateRequestSchema,
    updateTemplateRequestSchema,
} from '@inventory-system/contracts';

export const createTemplateSchema = z.object({
    body: createTemplateRequestSchema,
});

export const updateTemplateSchema = z.object({
    body: updateTemplateRequestSchema,
});

export const duplicateTemplateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120).optional(),
    }),
});
