import {
    authApiResponseSchema,
    categoriesApiResponseSchema,
    categoryApiResponseSchema,
    csvImportApiResponseSchema,
    currentVendorApiResponseSchema,
    messageResponseSchema,
    productApiResponseSchema,
    productImageApiResponseSchema,
    productsApiResponseSchema,
    templateApiResponseSchema,
    templatesApiResponseSchema,
    vendorApiResponseSchema,
    type CreateCategoryRequest,
    type CreateProductRequest,
    type CreateTemplateRequest,
    type LoginVendorRequest,
    type ProductListQuery,
    type RegisterVendorRequest,
    type UpdateCategoryRequest,
    type UpdateProductRequest,
    type UpdateTemplateRequest,
    type UpdateVendorRequest,
} from '@inventory-system/contracts';
import type { ApiClient } from './client';

const toQueryString = (query: Partial<ProductListQuery>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const value = params.toString();
    return value ? `?${value}` : '';
};

export const createInventoryApi = (client: ApiClient) => ({
    auth: {
        register: (body: RegisterVendorRequest) =>
            client.request('/auth/register', authApiResponseSchema, { method: 'POST', body }),
        login: (body: LoginVendorRequest) =>
            client.request('/auth/login', authApiResponseSchema, { method: 'POST', body }),
        logout: () => client.request('/auth/logout', messageResponseSchema, { method: 'POST' }),
        current: (signal?: AbortSignal) =>
            client.request('/auth/me', currentVendorApiResponseSchema, { signal }),
    },
    vendors: {
        update: (body: UpdateVendorRequest) =>
            client.request('/vendors/me', vendorApiResponseSchema, { method: 'PUT', body }),
        deactivate: () =>
            client.request('/vendors/me', messageResponseSchema, { method: 'DELETE' }),
    },
    products: {
        list: (query: Partial<ProductListQuery>, signal?: AbortSignal) =>
            client.request(
                `/products${toQueryString(query)}`,
                productsApiResponseSchema,
                { signal }
            ),
        get: (id: string, signal?: AbortSignal) =>
            client.request(`/products/${id}`, productApiResponseSchema, { signal }),
        create: (body: CreateProductRequest) =>
            client.request('/products', productApiResponseSchema, { method: 'POST', body }),
        update: (id: string, body: UpdateProductRequest) =>
            client.request(`/products/${id}`, productApiResponseSchema, {
                method: 'PUT',
                body,
            }),
        remove: (id: string) =>
            client.request(`/products/${id}`, messageResponseSchema, { method: 'DELETE' }),
        uploadImage: (id: string, body: FormData) =>
            client.request(`/products/${id}/images`, productImageApiResponseSchema, {
                method: 'POST',
                body,
            }),
        removeImage: (id: string, imageId: string) =>
            client.request(`/products/${id}/images/${imageId}`, messageResponseSchema, {
                method: 'DELETE',
            }),
        importCsv: (body: FormData) =>
            client.request('/products/import', csvImportApiResponseSchema, {
                method: 'POST',
                body,
            }),
        exportCsv: () => client.download('/products/export'),
    },
    categories: {
        list: (signal?: AbortSignal) =>
            client.request('/categories', categoriesApiResponseSchema, { signal }),
        create: (body: CreateCategoryRequest) =>
            client.request('/categories', categoryApiResponseSchema, { method: 'POST', body }),
        update: (id: string, body: UpdateCategoryRequest) =>
            client.request(`/categories/${id}`, categoryApiResponseSchema, {
                method: 'PUT',
                body,
            }),
        remove: (id: string) =>
            client.request(`/categories/${id}`, messageResponseSchema, { method: 'DELETE' }),
    },
    templates: {
        list: (signal?: AbortSignal) =>
            client.request('/templates', templatesApiResponseSchema, { signal }),
        get: (id: string, signal?: AbortSignal) =>
            client.request(`/templates/${id}`, templateApiResponseSchema, { signal }),
        create: (body: CreateTemplateRequest) =>
            client.request('/templates', templateApiResponseSchema, { method: 'POST', body }),
        update: (id: string, body: UpdateTemplateRequest) =>
            client.request(`/templates/${id}`, templateApiResponseSchema, {
                method: 'PUT',
                body,
            }),
        remove: (id: string) =>
            client.request(`/templates/${id}`, messageResponseSchema, { method: 'DELETE' }),
    },
});

export type InventoryApi = ReturnType<typeof createInventoryApi>;
