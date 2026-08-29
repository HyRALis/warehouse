import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema, paginatedApiSuccessSchema } from './common';

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'DISCONTINUED']);
export const PRODUCT_STATUSES = productStatusSchema.options;
export const ProductStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DISCONTINUED: 'DISCONTINUED',
} as const;

export const characteristicSchema = z.object({
    name: z.string().trim().min(1),
    value: z.string().trim().min(1),
    measurement: z.string().trim().optional(),
});

export const createProductRequestSchema = z.object({
    categoryId: z.string().uuid('Select a category'),
    sku: z.string().trim().min(1, 'SKU is required').max(120),
    baseName: z.string().trim().min(1, 'Product name is required').max(240),
    barcode: z.string().trim().optional(),
    characteristics: z.array(characteristicSchema),
    status: productStatusSchema.optional(),
});

export const updateProductRequestSchema = createProductRequestSchema.partial();

export const productListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z.string().trim().optional(),
    status: productStatusSchema.optional(),
    categoryId: z.string().uuid().optional(),
});

export const productImageSchema = z.object({
    id: z.string(),
    imageUrl: z.string().url(),
    sortOrder: z.number().int(),
});

export const productSchema = z.object({
    id: z.string(),
    vendorId: z.string(),
    categoryId: z.string(),
    sku: z.string(),
    baseName: z.string(),
    imageUrl: z.string().url().nullable(),
    barcode: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    status: productStatusSchema,
    characteristics: z.array(characteristicSchema),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    images: z.array(productImageSchema).optional().default([]),
    category: z.object({ id: z.string(), name: z.string() }).optional(),
});

export const productsApiResponseSchema = paginatedApiSuccessSchema(productSchema);
export const productApiResponseSchema = apiSuccessSchema(productSchema);
export const productImageApiResponseSchema = apiSuccessSchema(productImageSchema);

export const csvImportResultSchema = z.object({
    imported: z.number().int().nonnegative(),
    errors: z.array(z.string()),
});
export const csvImportApiResponseSchema = apiSuccessSchema(csvImportResultSchema);

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Characteristic = z.infer<typeof characteristicSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type Product = z.infer<typeof productSchema>;
export type CsvImportResult = z.infer<typeof csvImportResultSchema>;
