import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1),
        parentId: z.string().uuid().optional(),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1),
    }),
});
