import type { ProductStatus } from './product.js';

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

export type CsvImportErrorCode =
    | 'REQUIRED_FIELD'
    | 'CATEGORY_NOT_AVAILABLE'
    | 'CATEGORY_AMBIGUOUS'
    | 'INVALID_PRODUCT_STATUS'
    | 'INVALID_VERSION_STATUS'
    | 'INVALID_CHARACTERISTICS'
    | 'INVALID_PRIMARY_FLAG'
    | 'FIELD_TOO_LONG'
    | 'MULTIPLE_PRIMARY_VERSIONS'
    | 'PRODUCT_CONFLICT'
    | 'IDENTIFIER_CONFLICT'
    | 'IMPORT_FAILED';

export interface CsvImportRowError {
    row: number;
    code: CsvImportErrorCode;
    message: string;
    field?: string;
    value?: string;
}

export interface CsvImportResult {
    imported: number;
    importedProducts: number;
    importedVersions: number;
    failedRows: number;
    errors: CsvImportRowError[];
}

export interface ProductCsvRow {
    productReference?: string;
    productName: string;
    categoryCode?: string;
    categoryName?: string;
    productStatus: ProductStatus;
    versionLabel: string;
    versionStatus: ProductStatus;
    sku: string;
    barcode?: string;
    characteristics?: string;
    designNotes?: string;
    isPrimary: boolean;
}
