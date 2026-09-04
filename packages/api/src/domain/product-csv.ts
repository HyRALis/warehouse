import type {
    CsvImportErrorCode,
    CsvImportRowError,
    ProductStatus,
} from '@inventory-system/contracts';

const PRODUCT_STATUSES: ProductStatus[] = ['DRAFT', 'ACTIVE', 'DISCONTINUED'];

export const normalizeCsvValue = (value?: string) => value?.trim() || '';

/**
 * A cell starting with a formula character is executed on open by Excel and Sheets. Prefixing an
 * apostrophe keeps the exported value literal, so vendor-supplied text cannot become a formula.
 */
export const safeSpreadsheetCell = (value: string | null | undefined): string => {
    const normalized = value ?? '';
    return /^[=+\-@\t\r]/.test(normalized) ? `'${normalized}` : normalized;
};

export const parseCsvStatus = (value: string, fallback: ProductStatus): ProductStatus | null => {
    const normalized = (value || fallback).toUpperCase() as ProductStatus;
    return PRODUCT_STATUSES.includes(normalized) ? normalized : null;
};

export const parseCsvBoolean = (value: string): boolean | null => {
    if (!value) return null;
    if (['true', 'yes', '1'].includes(value.toLowerCase())) return true;
    if (['false', 'no', '0'].includes(value.toLowerCase())) return false;
    return null;
};

export const csvRowError = (
    row: number,
    code: CsvImportErrorCode,
    message: string,
    field?: string,
    value?: string
): CsvImportRowError => ({ row, code, message, ...(field && { field }), ...(value && { value }) });
