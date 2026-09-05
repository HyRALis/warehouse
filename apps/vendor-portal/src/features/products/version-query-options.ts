import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const productVersionsQueryOptions = (
    api: InventoryApi,
    tenantId: string,
    productId: string
) =>
    queryOptions({
        queryKey: tenantKeys.productVersions(tenantId, productId),
        queryFn: async ({ signal }) => (await api.productVersions.list(productId, signal)).data,
        staleTime: 30_000,
    });

export const productVersionComparisonQueryOptions = (
    api: InventoryApi,
    tenantId: string,
    productId: string,
    leftId: string,
    rightId: string
) =>
    queryOptions({
        queryKey: tenantKeys.productVersionComparison(tenantId, productId, leftId, rightId),
        queryFn: async ({ signal }) =>
            (await api.productVersions.compare(productId, leftId, rightId, signal)).data,
        staleTime: 30_000,
    });
