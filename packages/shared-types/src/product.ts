export interface Characteristic {
    name: string;
    value: string;
    measurement?: string;
}

export enum ProductStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    DISCONTINUED = 'DISCONTINUED',
}

export interface CreateProductRequest {
    categoryId: string;
    sku?: string;
    baseName: string;
    barcode?: string;
    characteristics?: Characteristic[];
    designNotes?: string;
    generateQrCode?: boolean;
    productStatus?: ProductStatus;
    versionStatus?: ProductStatus;
    /** @deprecated Use productStatus. Retained during the version migration. */
    status?: ProductStatus;
}

export interface UpdateProductRequest {
    categoryId?: string;
    sku?: string;
    baseName?: string;
    barcode?: string | null;
    characteristics?: Characteristic[];
    status?: ProductStatus;
}

export type ProductVersionCreateMode = 'BLANK' | 'COPY';

export interface CreateProductVersionRequest {
    label: string;
    mode: ProductVersionCreateMode;
    sourceVersionId?: string;
    sku?: string;
    barcode?: string;
    status?: ProductStatus;
    characteristics?: Characteristic[];
    designNotes?: string;
    generateQrCode?: boolean;
    copyImages?: boolean;
    setAsPrimary?: boolean;
}

export interface UpdateProductVersionRequest {
    label?: string;
    sku?: string;
    barcode?: string | null;
    status?: ProductStatus;
    characteristics?: Characteristic[];
    designNotes?: string | null;
    generateQrCode?: boolean;
}

export interface ProductResponse {
    id: string;
    vendorId: string;
    /** Primary catalog owner. vendorId remains during the authentication cleanup window. */
    vendorProfileId?: string;
    categoryId: string;
    sku: string;
    baseName: string;
    imageUrl: string | null;
    barcode?: string | null;
    qrCodeUrl?: string | null;
    status: ProductStatus;
    characteristics: Characteristic[];
    versionCount?: number;
    primaryVersion?: ProductVersionResponse | null;
    versions?: ProductVersionResponse[];
    createdAt: Date | string;
    updatedAt: Date | string;
    images?: {
        id: string;
        imageUrl: string;
        sortOrder: number;
    }[];
    category?: {
        id: string;
        name: string;
    };
}

export interface ProductVersionResponse {
    id: string;
    productId: string;
    vendorId: string;
    /** Primary catalog owner. vendorId remains during the authentication cleanup window. */
    vendorProfileId?: string;
    versionNumber: number;
    label: string;
    sku: string;
    barcode?: string | null;
    qrCodeUrl?: string | null;
    status: ProductStatus;
    characteristics: Characteristic[];
    designNotes?: string | null;
    isPrimary: boolean;
    effectiveStatus?: ProductStatus;
    canDelete?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    images?: {
        id: string;
        imageUrl: string;
        sortOrder: number;
    }[];
}

export interface ProductVersionComparisonResponse {
    left: ProductVersionResponse;
    right: ProductVersionResponse;
    differences: Array<{
        field: 'label' | 'sku' | 'barcode' | 'status' | 'designNotes' | 'characteristics';
        left: unknown;
        right: unknown;
    }>;
}

export interface ProductListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProductStatus;
    categoryId?: string;
}
