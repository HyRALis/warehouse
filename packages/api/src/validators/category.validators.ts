import { z } from 'zod';
import {
    createCategoryRequestSchema,
    updateCategoryRequestSchema,
} from '@inventory-system/contracts';

export const createCategorySchema = z.object({
    body: createCategoryRequestSchema,
});

export const updateCategorySchema = z.object({
    body: updateCategoryRequestSchema,
});
