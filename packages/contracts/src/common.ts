import { z } from 'zod';

export const isoDateSchema = z.string().datetime({ offset: true });

export const paginationMetaSchema = z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
});

export const apiIssueSchema = z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string().optional(),
});

export const apiErrorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    code: z.string(),
    statusCode: z.number().int(),
    requestId: z.string().optional(),
    issues: z.array(apiIssueSchema).optional(),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.literal(true),
        data: dataSchema,
        message: z.string().optional(),
    });

export const paginatedApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    apiSuccessSchema(z.array(dataSchema)).extend({ meta: paginationMetaSchema });

export const messageResponseSchema = apiSuccessSchema(z.null()).extend({ message: z.string() });

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type ApiIssue = z.infer<typeof apiIssueSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type PaginatedApiSuccess<T> = ApiSuccess<T[]> & { meta: PaginationMeta };
export type MessageResponse = z.infer<typeof messageResponseSchema>;
