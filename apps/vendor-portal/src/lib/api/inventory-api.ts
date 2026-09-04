import {
    authApiResponseSchema,
    categoriesApiResponseSchema,
    categoryApiResponseSchema,
    categoryOptionsApiResponseSchema,
    csvImportApiResponseSchema,
    currentVendorApiResponseSchema,
    messageResponseSchema,
    productApiResponseSchema,
    productImageApiResponseSchema,
    productsApiResponseSchema,
    productVersionApiResponseSchema,
    productVersionComparisonApiResponseSchema,
    productVersionsApiResponseSchema,
    templateApiResponseSchema,
    templatesApiResponseSchema,
    universalSearchApiResponseSchema,
    vendorApiResponseSchema,
    type CreateCategoryRequest,
    type CreateProductRequest,
    type CreateProductVersionRequest,
    type CreateTemplateRequest,
    type LoginVendorRequest,
    type ProductListQuery,
    type RegisterVendorRequest,
    type UpdateCategoryRequest,
    type UpdateProductRequest,
    type UpdateProductVersionRequest,
    type UpdateTemplateRequest,
    type UpdateVendorRequest,
} from '@inventory-system/contracts';
import type { ApiClient } from './client';

const toQueryString = (query: Record<string, unknown>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const value = params.toString();
    return value ? `?${value}` : '';
};

export interface UniversalSearchQuery {
    q: string;
    mode?: 'suggestions' | 'results';
    types?: string;
    type?: string;
    page?: number;
    limit?: number;
    limitPerType?: number;
}

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
            client.request(`/products${toQueryString(query)}`, productsApiResponseSchema, {
                signal,
            }),
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
    productVersions: {
        list: (productId: string, signal?: AbortSignal) =>
            client.request(
                `/products/${productId}/versions`,
                productVersionsApiResponseSchema,
                { signal }
            ),
        get: (productId: string, versionId: string, signal?: AbortSignal) =>
            client.request(
                `/products/${productId}/versions/${versionId}`,
                productVersionApiResponseSchema,
                { signal }
            ),
        create: (productId: string, body: CreateProductVersionRequest) =>
            client.request(
                `/products/${productId}/versions`,
                productVersionApiResponseSchema,
                { method: 'POST', body }
            ),
        update: (productId: string, versionId: string, body: UpdateProductVersionRequest) =>
            client.request(
                `/products/${productId}/versions/${versionId}`,
                productVersionApiResponseSchema,
                { method: 'PUT', body }
            ),
        setPrimary: (productId: string, versionId: string) =>
            client.request(
                `/products/${productId}/versions/${versionId}/primary`,
                productVersionApiResponseSchema,
                { method: 'POST' }
            ),
        remove: (productId: string, versionId: string) =>
            client.request(
                `/products/${productId}/versions/${versionId}`,
                messageResponseSchema,
                { method: 'DELETE' }
            ),
        compare: (productId: string, leftId: string, rightId: string, signal?: AbortSignal) =>
            client.request(
                `/products/${productId}/versions/compare${toQueryString({ leftId, rightId })}`,
                productVersionComparisonApiResponseSchema,
                { signal }
            ),
        uploadImage: (productId: string, versionId: string, body: FormData) =>
            client.request(
                `/products/${productId}/versions/${versionId}/images`,
                productImageApiResponseSchema,
                { method: 'POST', body }
            ),
    },
    categories: {
        list: (signal?: AbortSignal) =>
            client.request('/categories', categoriesApiResponseSchema, { signal }),
        options: (signal?: AbortSignal) =>
            client.request('/categories/options', categoryOptionsApiResponseSchema, { signal }),
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
        duplicate: (id: string, body: { name?: string } = {}) =>
            client.request(`/templates/${id}/duplicate`, templateApiResponseSchema, {
                method: 'POST',
                body,
            }),
        update: (id: string, body: UpdateTemplateRequest) =>
            client.request(`/templates/${id}`, templateApiResponseSchema, {
                method: 'PUT',
                body,
            }),
        remove: (id: string) =>
            client.request(`/templates/${id}`, messageResponseSchema, { method: 'DELETE' }),
    },
    search: {
        universal: (query: UniversalSearchQuery, signal?: AbortSignal) =>
            client.request(
                `/search${toQueryString(query as unknown as Record<string, unknown>)}`,
                universalSearchApiResponseSchema,
                { signal }
            ),
    },
});

export type InventoryApi = ReturnType<typeof createInventoryApi>;
