import { z } from 'zod';

const entityTypes = ['product', 'version', 'category', 'template'] as const;

export const universalSearchSchema = z.object({
    query: z.object({
        q: z.string().trim().min(1).max(100),
        mode: z.enum(['suggestions', 'results']).default('suggestions'),
        types: z
            .string()
            .max(100)
            .refine(
                (value) =>
                    value
                        .split(',')
                        .filter(Boolean)
                        .every((type) => entityTypes.includes(type as (typeof entityTypes)[number])),
                'types must contain only product, version, category, or template'
            )
            .optional(),
        page: z.coerce.number().int().min(1).max(100).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
});
