const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

import type {
    AuthResponse,
    CreateProductRequest,
    LoginVendorRequest,
    RegisterVendorRequest,
    UpdateProductRequest,
    UniversalSearchResponse,
} from '@inventory-system/shared-types';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: { total: number; page: number; limit: number; totalPages: number };
}

export class ApiError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(
            data.message || 'An unexpected error occurred',
            response.status,
            data.code
        );
    }

    return data;
}

export const api = {
    universalSearch: (
        params: {
            q: string;
            mode?: 'suggestions' | 'results';
            types?: string;
            page?: number;
            limit?: number;
        },
        signal?: AbortSignal
    ) => {
        const query = new URLSearchParams(
            Object.entries(params).reduce<Record<string, string>>((result, [key, value]) => {
                if (value !== undefined && value !== '') result[key] = String(value);
                return result;
            }, {})
        );
        return request<UniversalSearchResponse>(`/search?${query.toString()}`, { signal });
    },

    // Auth
    register: (body: RegisterVendorRequest) =>
        request<ApiResponse<AuthResponse>>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    login: (body: LoginVendorRequest) =>
        request<ApiResponse<AuthResponse>>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    getMe: () => request<any>('/auth/me'),

    // Products
    getProducts: (params?: Record<string, string | number>) => {
        const query = new URLSearchParams(params as any).toString();
        return request<any>(`/products${query ? `?${query}` : ''}`);
    },
    getProduct: (id: string) => request<any>(`/products/${id}`),
    createProduct: (body: CreateProductRequest) =>
        request<any>('/products', { method: 'POST', body: JSON.stringify(body) }),
    updateProduct: (id: string, body: UpdateProductRequest) =>
        request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
    uploadProductImage: (id: string, formData: FormData) =>
        request<any>(`/products/${id}/images`, { method: 'POST', body: formData }),
    deleteProductImage: (id: string, imageId: string) =>
        request<any>(`/products/${id}/images/${imageId}`, { method: 'DELETE' }),
    getProductVersions: (productId: string) =>
        request<any>(`/products/${productId}/versions`),
    getProductVersion: (productId: string, versionId: string) =>
        request<any>(`/products/${productId}/versions/${versionId}`),
    createProductVersion: (productId: string, body: any) =>
        request<any>(`/products/${productId}/versions`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    updateProductVersion: (productId: string, versionId: string, body: any) =>
        request<any>(`/products/${productId}/versions/${versionId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        }),
    setPrimaryProductVersion: (productId: string, versionId: string) =>
        request<any>(`/products/${productId}/versions/${versionId}/primary`, {
            method: 'POST',
        }),
    deleteProductVersion: (productId: string, versionId: string) =>
        request<any>(`/products/${productId}/versions/${versionId}`, { method: 'DELETE' }),
    compareProductVersions: (productId: string, leftId: string, rightId: string) => {
        const query = new URLSearchParams({ leftId, rightId });
        return request<any>(`/products/${productId}/versions/compare?${query.toString()}`);
    },
    uploadProductVersionImage: (productId: string, versionId: string, formData: FormData) =>
        request<any>(`/products/${productId}/versions/${versionId}/images`, {
            method: 'POST',
            body: formData,
        }),

    // Categories
    getCategories: () => request<any>('/categories'),
    createCategory: (body: any) =>
        request<any>('/categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (id: string, body: any) =>
        request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCategory: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),

    // Templates
    getTemplates: () => request<any>('/templates'),
    getTemplate: (id: string) => request<any>(`/templates/${id}`),
    createTemplate: (body: any) =>
        request<any>('/templates', { method: 'POST', body: JSON.stringify(body) }),
    duplicateTemplate: (id: string, body: { name?: string } = {}) =>
        request<any>(`/templates/${id}/duplicate`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    updateTemplate: (id: string, body: any) =>
        request<any>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteTemplate: (id: string) => request<any>(`/templates/${id}`, { method: 'DELETE' }),

    // Vendor Profile
    updateProfile: (body: any) =>
        request<any>('/vendors/me', { method: 'PUT', body: JSON.stringify(body) }),
    deleteAccount: () => request<any>('/vendors/me', { method: 'DELETE' }),

    // Bulk Operations
    importCSV: (formData: FormData) =>
        request<any>('/products/import', { method: 'POST', body: formData }),
    exportCSV: async () => {
        const response = await fetch(`${API_BASE_URL}/products/export`, {
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new ApiError(data.message || 'Export failed', response.status, data.code);
        }

        return response.blob();
    },
};
