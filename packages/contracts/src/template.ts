import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema } from './common';

export const templateFieldSchema = z.object({
    name: z.string().trim().min(1, 'Field name is required'),
    measurement: z.string().trim().optional(),
});

export const createTemplateRequestSchema = z.object({
    name: z.string().trim().min(1, 'Template name is required').max(120),
    fields: z.array(templateFieldSchema).min(1, 'Add at least one field'),
});

export const updateTemplateRequestSchema = createTemplateRequestSchema.partial();

export const templateSchema = z.object({
    id: z.string(),
    vendorId: z.string(),
    name: z.string(),
    fields: z.array(templateFieldSchema),
    createdAt: isoDateSchema,
});

export const templatesApiResponseSchema = apiSuccessSchema(z.array(templateSchema));
export const templateApiResponseSchema = apiSuccessSchema(templateSchema);

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type CreateTemplateRequest = z.infer<typeof createTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof updateTemplateRequestSchema>;
export type Template = z.infer<typeof templateSchema>;
