import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const categoriesQueryOptions = (api: InventoryApi, tenantId: string) =>
    queryOptions({
        queryKey: tenantKeys.categories(tenantId),
        queryFn: async ({ signal }) => (await api.categories.list(signal)).data,
        staleTime: 30_000,
    });
