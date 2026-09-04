import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const categoriesQueryOptions = (api: InventoryApi, tenantId: string) =>
    queryOptions({
        queryKey: tenantKeys.categories(tenantId),
        queryFn: async ({ signal }) => (await api.categories.list(signal)).data,
        staleTime: 30_000,
    });

export const categoryOptionsQueryOptions = (api: InventoryApi, tenantId: string) =>
    queryOptions({
        queryKey: tenantKeys.categoryOptions(tenantId),
        queryFn: async ({ signal }) => (await api.categories.options(signal)).data,
        // The seeded system taxonomy is effectively static for the life of a session.
        staleTime: 5 * 60_000,
    });
