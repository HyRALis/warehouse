'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    CreateProductVersionRequest,
    UpdateProductVersionRequest,
} from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { tenantKeys } from '@/features/query-keys';
import {
    productVersionComparisonQueryOptions,
    productVersionsQueryOptions,
} from './version-query-options';

const PENDING_TENANT = 'pending';

export const useProductVersions = (productId: string) => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...productVersionsQueryOptions(browserApi, vendor?.id || PENDING_TENANT, productId),
        enabled: Boolean(vendor && productId),
    });
};

export const useProductVersionComparison = (
    productId: string,
    leftId: string | null,
    rightId: string | null
) => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...productVersionComparisonQueryOptions(
            browserApi,
            vendor?.id || PENDING_TENANT,
            productId,
            leftId || '',
            rightId || ''
        ),
        enabled: Boolean(vendor && productId && leftId && rightId && leftId !== rightId),
    });
};

/** Invalidates both the version list and the parent product summary. */
const useVersionInvalidation = (productId: string) => {
    const { data: vendor } = useCurrentVendor();
    const queryClient = useQueryClient();

    return async () => {
        if (!vendor) return;
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: tenantKeys.productVersions(vendor.id, productId),
            }),
            queryClient.invalidateQueries({
                queryKey: tenantKeys.productDetail(vendor.id, productId),
            }),
            queryClient.invalidateQueries({ queryKey: tenantKeys.productLists(vendor.id) }),
        ]);
    };
};

export const useCreateProductVersion = (productId: string) => {
    const invalidate = useVersionInvalidation(productId);
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: CreateProductVersionRequest) =>
            browserApi.productVersions.create(productId, body),
        onSuccess: async () => {
            await invalidate();
            notify({ title: 'Version created', variant: 'success' });
        },
    });
};

export const useUpdateProductVersion = (productId: string) => {
    const invalidate = useVersionInvalidation(productId);
    const { notify } = useToast();
    return useMutation({
        mutationFn: ({
            versionId,
            body,
        }: {
            versionId: string;
            body: UpdateProductVersionRequest;
        }) => browserApi.productVersions.update(productId, versionId, body),
        onSuccess: async () => {
            await invalidate();
            notify({ title: 'Version updated', variant: 'success' });
        },
    });
};

export const useSetPrimaryProductVersion = (productId: string) => {
    const invalidate = useVersionInvalidation(productId);
    const { notify } = useToast();
    return useMutation({
        mutationFn: (versionId: string) =>
            browserApi.productVersions.setPrimary(productId, versionId),
        onSuccess: async () => {
            await invalidate();
            notify({ title: 'Primary version updated', variant: 'success' });
        },
    });
};

export const useDeleteProductVersion = (productId: string) => {
    const invalidate = useVersionInvalidation(productId);
    const { notify } = useToast();
    return useMutation({
        mutationFn: (versionId: string) => browserApi.productVersions.remove(productId, versionId),
        onSuccess: async () => {
            await invalidate();
            notify({ title: 'Version removed', variant: 'success' });
        },
    });
};
