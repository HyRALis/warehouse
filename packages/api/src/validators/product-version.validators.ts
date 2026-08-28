import { z } from 'zod';
import { ProductStatus } from '@inventory-system/shared-types';
import { characteristicSchema } from './product.validators';

const versionParams = z.object({
    productId: z.string().uuid(),
    versionId: z.string().uuid().optional(),
});

export const createProductVersionSchema = z.object({
    params: versionParams.pick({ productId: true }),
    body: z
        .object({
            label: z.string().trim().min(1).max(100),
            mode: z.enum(['BLANK', 'COPY']),
            sourceVersionId: z.string().uuid().optional(),
            sku: z.string().trim().min(1).max(100).optional(),
            barcode: z.string().trim().min(1).max(100).optional(),
            status: z.nativeEnum(ProductStatus).optional(),
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
        }),
});

export const updateProductVersionSchema = z.object({
    params: versionParams.required(),
    body: z.object({
        label: z.string().trim().min(1).max(100).optional(),
        sku: z.string().trim().min(1).max(100).optional(),
        barcode: z.string().trim().min(1).max(100).nullable().optional(),
        status: z.nativeEnum(ProductStatus).optional(),
        characteristics: z.array(characteristicSchema).max(100).optional(),
        designNotes: z.string().max(5000).nullable().optional(),
        generateQrCode: z.boolean().optional(),
    }),
});

export const productVersionParamsSchema = z.object({
    params: versionParams.required(),
});

export const compareProductVersionsSchema = z.object({
    params: versionParams.pick({ productId: true }),
    query: z.object({
        leftId: z.string().uuid(),
        rightId: z.string().uuid(),
    }),
});
