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
    vendorProfileId?: string | null;
    defaultTemplateId?: string | null;
    defaultTemplate?: {
        id: string;
        key?: string | null;
        name: string;
        fields: Array<{ name: string; measurement?: string }>;
    } | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
    children?: CategoryResponse[];
}
