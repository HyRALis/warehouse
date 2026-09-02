import { z } from 'zod';
import { ProductStatus } from '@inventory-system/shared-types';

export const characteristicSchema = z.object({
    name: z.string().trim().min(1).max(100),
    value: z.string().max(500),
    measurement: z.string().optional(),
});

export const createProductSchema = z.object({
    body: z.object({
        categoryId: z.string().uuid(),
        sku: z.string().trim().min(1).max(100).optional(),
        baseName: z.string().trim().min(1).max(200),
        barcode: z.string().trim().min(1).max(100).optional(),
        characteristics: z.array(characteristicSchema).max(100).default([]),
        designNotes: z.string().max(5000).optional(),
        generateQrCode: z.boolean().default(true),
        productStatus: z.nativeEnum(ProductStatus).optional(),
        versionStatus: z.nativeEnum(ProductStatus).optional(),
        status: z.nativeEnum(ProductStatus).optional(),
    }),
});

export const updateProductSchema = z.object({
    body: z
        .object({
            categoryId: z.string().uuid().optional(),
            sku: z.string().trim().min(1).max(100).optional(),
            baseName: z.string().trim().min(1).max(200).optional(),
            barcode: z.string().trim().min(1).max(100).nullable().optional(),
            characteristics: z.array(characteristicSchema).max(100).optional(),
            status: z.nativeEnum(ProductStatus).optional(),
        })
        .refine((body) => Object.keys(body).length > 0, {
            message: 'At least one product field is required',
        }),
});
