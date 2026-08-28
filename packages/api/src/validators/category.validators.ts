import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120),
        parentId: z.string().uuid().nullable().optional(),
        defaultTemplateId: z.string().uuid().nullable().optional(),
        aliases: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120).optional(),
        parentId: z.string().uuid().nullable().optional(),
        defaultTemplateId: z.string().uuid().nullable().optional(),
        aliases: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    }),
});
