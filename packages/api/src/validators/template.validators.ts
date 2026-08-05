import { z } from 'zod';

export const createTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        fields: z.array(
            z.object({
                name: z.string(),
                measurement: z.string().optional(),
            })
        ),
    }),
});

export const updateTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        fields: z
            .array(
                z.object({
                    name: z.string(),
                    measurement: z.string().optional(),
                })
            )
            .optional(),
    }),
});
