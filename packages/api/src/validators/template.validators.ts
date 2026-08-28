import { z } from 'zod';

export const createTemplateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120),
        fields: z.array(
            z.object({
                name: z.string().trim().min(1).max(100),
                measurement: z.string().trim().max(40).optional(),
            })
        ),
    }),
});

export const updateTemplateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120).optional(),
        fields: z
            .array(
                z.object({
                    name: z.string().trim().min(1).max(100),
                    measurement: z.string().trim().max(40).optional(),
                })
            )
            .optional(),
    }),
});

export const duplicateTemplateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120).optional(),
    }),
});
