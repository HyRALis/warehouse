import { z } from 'zod';
import {
    characteristicSchema,
    createProductRequestSchema,
    productListQuerySchema,
    updateProductRequestSchema,
} from '@inventory-system/contracts';

export const createProductSchema = z.object({
    body: createProductRequestSchema,
});

export const updateProductSchema = z.object({
    body: updateProductRequestSchema,
});

export const listProductsSchema = z.object({ query: productListQuerySchema });
