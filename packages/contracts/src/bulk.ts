import { z } from 'zod';
import { apiSuccessSchema } from './common';
import { productStatusSchema } from './product';

export const PRODUCT_CSV_COLUMNS = [
    'productReference',
    'productName',
    'categoryCode',
    'categoryName',
    'productStatus',
    'versionLabel',
    'versionStatus',
    'sku',
    'barcode',
    'characteristics',
    'designNotes',
    'isPrimary',
] as const;

export const csvImportErrorCodeSchema = z.enum([
    'REQUIRED_FIELD',
    'CATEGORY_NOT_AVAILABLE',
    'CATEGORY_AMBIGUOUS',
    'INVALID_PRODUCT_STATUS',
    'INVALID_VERSION_STATUS',
    'INVALID_CHARACTERISTICS',
    'INVALID_PRIMARY_FLAG',
    'FIELD_TOO_LONG',
    'MULTIPLE_PRIMARY_VERSIONS',
    'PRODUCT_CONFLICT',
    'IDENTIFIER_CONFLICT',
    'IMPORT_FAILED',
]);

export const csvImportRowErrorSchema = z.object({
    row: z.number().int().nonnegative(),
    code: csvImportErrorCodeSchema,
    message: z.string(),
    field: z.string().optional(),
    value: z.string().optional(),
});

export const csvImportResultSchema = z.object({
    imported: z.number().int().nonnegative(),
    importedProducts: z.number().int().nonnegative(),
    importedVersions: z.number().int().nonnegative(),
    failedRows: z.number().int().nonnegative(),
    errors: z.array(csvImportRowErrorSchema),
});

export const csvImportApiResponseSchema = apiSuccessSchema(csvImportResultSchema);

export const productCsvRowSchema = z.object({
    productReference: z.string().optional(),
    productName: z.string(),
    categoryCode: z.string().optional(),
    categoryName: z.string().optional(),
    productStatus: productStatusSchema,
    versionLabel: z.string(),
    versionStatus: productStatusSchema,
    sku: z.string(),
    barcode: z.string().optional(),
    characteristics: z.string().optional(),
    designNotes: z.string().optional(),
    isPrimary: z.boolean(),
});

export type ProductCsvColumn = (typeof PRODUCT_CSV_COLUMNS)[number];
export type CsvImportErrorCode = z.infer<typeof csvImportErrorCodeSchema>;
export type CsvImportRowError = z.infer<typeof csvImportRowErrorSchema>;
export type CsvImportResult = z.infer<typeof csvImportResultSchema>;
export type ProductCsvRow = z.infer<typeof productCsvRowSchema>;
