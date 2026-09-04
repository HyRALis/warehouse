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
    name: z.string().trim().min(1).max(100),
    value: z.string().max(500),
    measurement: z.string().trim().optional(),
});

export const productVersionCreateModeSchema = z.enum(['BLANK', 'COPY']);

/**
 * Product creation also creates the initial primary version, so the payload carries both the
 * parent product status and the version status. `sku` is optional; the API generates one.
 */
export const createProductRequestSchema = z.object({
    categoryId: z.string().uuid('Select a category'),
    sku: z.string().trim().min(1).max(100).optional(),
    baseName: z.string().trim().min(1, 'Product name is required').max(200),
    barcode: z.string().trim().min(1).max(100).optional(),
    characteristics: z.array(characteristicSchema).max(100).default([]),
    designNotes: z.string().max(5000).optional(),
    generateQrCode: z.boolean().default(true),
    productStatus: productStatusSchema.optional(),
    versionStatus: productStatusSchema.optional(),
    /** @deprecated Use `productStatus`. Retained until the transitional-field cleanup lands. */
    status: productStatusSchema.optional(),
});

export const updateProductRequestSchema = z.object({
    categoryId: z.string().uuid().optional(),
    sku: z.string().trim().min(1).max(100).optional(),
    baseName: z.string().trim().min(1).max(200).optional(),
    barcode: z.string().trim().min(1).max(100).optional(),
    characteristics: z.array(characteristicSchema).max(100).optional(),
    status: productStatusSchema.optional(),
});

export const createProductVersionRequestSchema = z
    .object({
        label: z.string().trim().min(1, 'Version label is required').max(100),
        mode: productVersionCreateModeSchema,
        sourceVersionId: z.string().uuid().optional(),
        sku: z.string().trim().min(1).max(100).optional(),
        barcode: z.string().trim().min(1).max(100).optional(),
        status: productStatusSchema.optional(),
        characteristics: z.array(characteristicSchema).max(100).optional(),
        designNotes: z.string().max(5000).optional(),
        generateQrCode: z.boolean().optional(),
        copyImages: z.boolean().optional(),
        setAsPrimary: z.boolean().optional(),
    })
    .superRefine((body, context) => {
        if (body.mode === 'COPY' && !body.sourceVersionId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sourceVersionId'],
                message: 'sourceVersionId is required when mode is COPY',
            });
        }
        if (body.mode === 'BLANK' && body.sourceVersionId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sourceVersionId'],
                message: 'sourceVersionId is only valid when mode is COPY',
            });
        }
    });

export const updateProductVersionRequestSchema = z.object({
    label: z.string().trim().min(1).max(100).optional(),
    sku: z.string().trim().min(1).max(100).optional(),
    barcode: z.string().trim().min(1).max(100).nullable().optional(),
    status: productStatusSchema.optional(),
    characteristics: z.array(characteristicSchema).max(100).optional(),
    designNotes: z.string().max(5000).nullable().optional(),
    generateQrCode: z.boolean().optional(),
});

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

export const productVersionSchema = z.object({
    id: z.string(),
    productId: z.string(),
    vendorId: z.string(),
    /** Primary catalog owner. `vendorId` remains during the authentication cleanup window. */
    vendorProfileId: z.string().optional(),
    versionNumber: z.number().int(),
    label: z.string(),
    sku: z.string(),
    barcode: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    status: productStatusSchema,
    characteristics: z.array(characteristicSchema),
    designNotes: z.string().nullable().optional(),
    isPrimary: z.boolean(),
    effectiveStatus: productStatusSchema.optional(),
    canDelete: z.boolean().optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    images: z.array(productImageSchema).optional().default([]),
});

export const productSchema = z.object({
    id: z.string(),
    vendorId: z.string(),
    /** Primary catalog owner. `vendorId` remains during the authentication cleanup window. */
    vendorProfileId: z.string().optional(),
    categoryId: z.string(),
    sku: z.string(),
    baseName: z.string(),
    imageUrl: z.string().url().nullable(),
    barcode: z.string().nullable().optional(),
    qrCodeUrl: z.string().nullable().optional(),
    status: productStatusSchema,
    characteristics: z.array(characteristicSchema),
    versionCount: z.number().int().optional(),
    primaryVersion: productVersionSchema.nullable().optional(),
    versions: z.array(productVersionSchema).optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    images: z.array(productImageSchema).optional().default([]),
    category: z.object({ id: z.string(), name: z.string() }).optional(),
});

export const productVersionComparisonSchema = z.object({
    left: productVersionSchema,
    right: productVersionSchema,
    differences: z.array(
        z.object({
            field: z.enum([
                'label',
                'sku',
                'barcode',
                'status',
                'designNotes',
                'characteristics',
            ]),
            left: z.unknown(),
            right: z.unknown(),
        })
    ),
});

export const productsApiResponseSchema = paginatedApiSuccessSchema(productSchema);
export const productApiResponseSchema = apiSuccessSchema(productSchema);
export const productImageApiResponseSchema = apiSuccessSchema(productImageSchema);
export const productVersionsApiResponseSchema = apiSuccessSchema(z.array(productVersionSchema));
export const productVersionApiResponseSchema = apiSuccessSchema(productVersionSchema);
export const productVersionComparisonApiResponseSchema = apiSuccessSchema(
    productVersionComparisonSchema
);

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Characteristic = z.infer<typeof characteristicSchema>;
export type ProductVersionCreateMode = z.infer<typeof productVersionCreateModeSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type CreateProductVersionRequest = z.infer<typeof createProductVersionRequestSchema>;
export type UpdateProductVersionRequest = z.infer<typeof updateProductVersionRequestSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVersion = z.infer<typeof productVersionSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductVersionComparison = z.infer<typeof productVersionComparisonSchema>;
