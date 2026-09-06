import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema } from './common';
import { templateFieldSchema } from './template';

export const categorySourceSchema = z.enum(['SYSTEM', 'VENDOR']);

export const createCategoryRequestSchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(120),
    parentId: z.string().uuid().nullable().optional(),
    defaultTemplateId: z.string().uuid().nullable().optional(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export const updateCategoryRequestSchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(120).optional(),
    parentId: z.string().uuid().nullable().optional(),
    defaultTemplateId: z.string().uuid().nullable().optional(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});

export const categoryDefaultTemplateSchema = z.object({
    id: z.string(),
    key: z.string().nullable().optional(),
    name: z.string(),
    fields: z.array(templateFieldSchema),
});

export type Category = {
    id: string;
    code?: string | null;
    name: string;
    aliases?: string[];
    parentId?: string | null;
    vendorProfileId?: string | null;
    defaultTemplateId?: string | null;
    defaultTemplate?: z.infer<typeof categoryDefaultTemplateSchema> | null;
    createdAt: string;
    updatedAt?: string;
    children?: Category[];
};

export const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        id: z.string(),
        code: z.string().nullable().optional(),
        name: z.string(),
        aliases: z.array(z.string()).optional(),
        parentId: z.string().nullable().optional(),
        vendorProfileId: z.string().nullable().optional(),
        defaultTemplateId: z.string().nullable().optional(),
        defaultTemplate: categoryDefaultTemplateSchema.nullable().optional(),
        createdAt: isoDateSchema,
        updatedAt: isoDateSchema.optional(),
        children: z.array(categorySchema).optional(),
    })
);

/**
 * Flattened option used by `SearchableCategorySelect`, product filters, and CSV mapping.
 * Only leaf categories are selectable; roots render as group headings.
 */
export const categoryOptionSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    path: z.string(),
    aliases: z.array(z.string()).default([]),
    parentId: z.string(),
    defaultTemplateId: z.string().nullable(),
    source: categorySourceSchema,
});

export const categoriesApiResponseSchema = apiSuccessSchema(z.array(categorySchema));
export const categoryApiResponseSchema = apiSuccessSchema(categorySchema);
export const categoryOptionsApiResponseSchema = apiSuccessSchema(z.array(categoryOptionSchema));

export type CategorySource = z.infer<typeof categorySourceSchema>;
export type CategoryDefaultTemplate = z.infer<typeof categoryDefaultTemplateSchema>;
export type CategoryOption = z.infer<typeof categoryOptionSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
