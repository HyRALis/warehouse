'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCategoryRequest } from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { tenantKeys } from '@/features/query-keys';
import { categoriesQueryOptions, categoryOptionsQueryOptions } from './query-options';

export const useCategories = () => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...categoriesQueryOptions(browserApi, vendor?.id || 'pending'),
        enabled: Boolean(vendor),
    });
};

export const useCategoryOptions = () => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...categoryOptionsQueryOptions(browserApi, vendor?.id || 'pending'),
        enabled: Boolean(vendor),
    });
};

export const useCreateCategory = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: CreateCategoryRequest) => browserApi.categories.create(body),
        onSuccess: async () => {
            if (!vendor) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.categories(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
            notify({ title: 'Category created', variant: 'success' });
        },
    });
};

export const useDeleteCategory = () => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: browserApi.categories.remove,
        onSuccess: async () => {
            if (!vendor) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: tenantKeys.categories(vendor.id) }),
                queryClient.invalidateQueries({ queryKey: tenantKeys.dashboard(vendor.id) }),
            ]);
            notify({ title: 'Category deleted', variant: 'success' });
        },
    });
};
