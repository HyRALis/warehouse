'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProductRequest, ProductListQuery } from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { tenantKeys } from '@/features/query-keys';
import { productQueryOptions, productsQueryOptions } from './query-options';

export const useProducts = (filters: ProductListQuery) => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...productsQueryOptions(browserApi, vendor?.id || 'pending', filters),
        enabled: Boolean(vendor),
    });
};

export const useProduct = (id: string) => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...productQueryOptions(browserApi, vendor?.id || 'pending', id),
        enabled: Boolean(vendor && id),
    });
};

export const useCreateProduct = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateProductRequest) => browserApi.products.create(body),
        onSuccess: async ({ data }) => {
            if (!vendor) return;
            queryClient.setQueryData(tenantKeys.productDetail(vendor.id, data.id), data);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.productLists(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
        },
    });
};

export const useUploadProductImage = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ productId, file }: { productId: string; file: File }) => {
            const body = new FormData();
            body.append('image', file);
            body.append('isPrimary', 'true');
            return browserApi.products.uploadImage(productId, body);
        },
        onSuccess: async (_, { productId }) => {
            if (!vendor) return;
            await queryClient.invalidateQueries({
                queryKey: tenantKeys.productDetail(vendor.id, productId),
            });
        },
    });
};

export const useDeleteProduct = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: browserApi.products.remove,
        onSuccess: async (_, id) => {
            if (!vendor) return;
            queryClient.removeQueries({ queryKey: tenantKeys.productDetail(vendor.id, id) });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.productLists(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
            notify({ title: 'Product removed', variant: 'success' });
        },
    });
};
