import { z } from 'zod';
import {
    createTemplateRequestSchema,
    updateTemplateRequestSchema,
} from '@inventory-system/contracts';

export const createTemplateSchema = z.object({
    body: createTemplateRequestSchema,
});

export const updateTemplateSchema = z.object({
    body: updateTemplateRequestSchema,
});
