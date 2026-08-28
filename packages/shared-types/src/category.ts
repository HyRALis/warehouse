export interface CreateCategoryRequest {
    name: string;
    parentId?: string;
}

export interface UpdateCategoryRequest {
    name?: string;
}

export interface CategoryResponse {
    id: string;
    code?: string | null;
    name: string;
    aliases?: string[];
    parentId?: string | null;
    vendorId?: string | null;
    defaultTemplateId?: string | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
    children?: CategoryResponse[];
}
