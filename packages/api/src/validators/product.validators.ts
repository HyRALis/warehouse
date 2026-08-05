import { z } from 'zod';
import { ProductStatus } from '@inventory-system/shared-types';

export const characteristicSchema = z.object({
    name: z.string(),
    value: z.string(),
    measurement: z.string().optional(),
});

export const createProductSchema = z.object({
    body: z.object({
        categoryId: z.string().uuid(),
        sku: z.string(),
        baseName: z.string(),
        barcode: z.string().optional(),
        characteristics: z.array(characteristicSchema),
        status: z.nativeEnum(ProductStatus).optional(),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        categoryId: z.string().uuid().optional(),
        sku: z.string().optional(),
        baseName: z.string().optional(),
        barcode: z.string().optional(),
        characteristics: z.array(characteristicSchema).optional(),
        status: z.nativeEnum(ProductStatus).optional(),
    }),
});
