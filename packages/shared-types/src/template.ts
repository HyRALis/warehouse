export interface TemplateField {
    name: string;
    measurement?: string;
}

export interface CreateTemplateRequest {
    name: string;
    fields: TemplateField[];
}

export interface UpdateTemplateRequest {
    name?: string;
    fields?: TemplateField[];
}

export interface TemplateResponse {
    id: string;
    vendorId: string | null;
    key?: string | null;
    name: string;
    fields: TemplateField[];
    createdAt: Date | string;
}
