import { z } from 'zod';
import { apiSuccessSchema } from './common';

export const universalSearchEntityTypeSchema = z.enum([
    'product',
    'version',
    'category',
    'template',
]);

export const universalSearchModeSchema = z.enum(['suggestions', 'results']);

export const universalSearchResultSchema = z.object({
    type: universalSearchEntityTypeSchema,
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    href: z.string(),
    score: z.number(),
    matchedField: z.string(),
    context: z.object({
        productId: z.string().optional(),
        productName: z.string().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        status: z.string().optional(),
        categoryCode: z.string().optional(),
        breadcrumb: z.string().optional(),
        ownership: z.enum(['system', 'vendor']).optional(),
    }),
});

export const universalSearchGroupSchema = z.object({
    type: universalSearchEntityTypeSchema,
    label: z.string(),
    results: z.array(universalSearchResultSchema),
});

export const universalSearchResponseSchema = z.object({
    query: z.string(),
    mode: universalSearchModeSchema,
    groups: z.array(universalSearchGroupSchema),
    data: z.array(universalSearchResultSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    tookMs: z.number().nonnegative(),
});

export const universalSearchApiResponseSchema = apiSuccessSchema(universalSearchResponseSchema);

export type UniversalSearchEntityType = z.infer<typeof universalSearchEntityTypeSchema>;
export type UniversalSearchMode = z.infer<typeof universalSearchModeSchema>;
export type UniversalSearchResult = z.infer<typeof universalSearchResultSchema>;
export type UniversalSearchGroup = z.infer<typeof universalSearchGroupSchema>;
export type UniversalSearchResponse = z.infer<typeof universalSearchResponseSchema>;
