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
    sku: string;
    baseName: string;
    barcode?: string;
    characteristics: Characteristic[];
    status?: ProductStatus;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductResponse {
    id: string;
    vendorId: string;
    categoryId: string;
    sku: string;
    baseName: string;
    imageUrl: string;
    barcode?: string | null;
    qrCodeUrl?: string | null;
    status: ProductStatus;
    characteristics: Characteristic[];
    createdAt: Date | string;
    updatedAt: Date | string;
    images?: {
        id: string;
        imageUrl: string;
        sortOrder: number;
    }[];
}

export interface ProductListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProductStatus;
    categoryId?: string;
}
