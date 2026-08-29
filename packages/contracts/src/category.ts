import { z } from 'zod';
import { apiSuccessSchema, isoDateSchema } from './common';

export const createCategoryRequestSchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(120),
    parentId: z.string().uuid().optional(),
});

export const updateCategoryRequestSchema = createCategoryRequestSchema.pick({ name: true });

export type Category = {
    id: string;
    name: string;
    parentId?: string | null;
    vendorId?: string | null;
    createdAt: string;
    children?: Category[];
};

export const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullable().optional(),
        vendorId: z.string().nullable().optional(),
        createdAt: isoDateSchema,
        children: z.array(categorySchema).optional(),
    })
);

export const categoriesApiResponseSchema = apiSuccessSchema(z.array(categorySchema));
export const categoryApiResponseSchema = apiSuccessSchema(categorySchema);

export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
