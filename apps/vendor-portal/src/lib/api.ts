const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

import type { CreateProductRequest, UpdateProductRequest } from '@inventory-system/shared-types';

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

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('vendor_auth_token');
}

export function setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('vendor_auth_token', token);
    }
}

export function removeAuthToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('vendor_auth_token');
    }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        removeAuthToken();
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
    // Auth
    register: (body: any) =>
        request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) =>
        request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
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
    exportCSVUrl: () => `${API_BASE_URL}/products/export`,
};
