import { queryOptions } from '@tanstack/react-query';
import type { ProductListQuery } from '@inventory-system/contracts';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const productsQueryOptions = (
    api: InventoryApi,
    tenantId: string,
    filters: ProductListQuery
) =>
    queryOptions({
        queryKey: tenantKeys.productList(tenantId, filters),
        queryFn: ({ signal }) => api.products.list(filters, signal),
        staleTime: 30_000,
    });

export const productQueryOptions = (api: InventoryApi, tenantId: string, id: string) =>
    queryOptions({
        queryKey: tenantKeys.productDetail(tenantId, id),
        queryFn: async ({ signal }) => (await api.products.get(id, signal)).data,
        staleTime: 60_000,
    });
