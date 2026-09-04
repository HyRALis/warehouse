import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi, UniversalSearchQuery } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const MIN_SEARCH_LENGTH = 2;

export const universalSearchQueryOptions = (
    api: InventoryApi,
    tenantId: string,
    query: UniversalSearchQuery
) =>
    queryOptions({
        queryKey: tenantKeys.searchQuery(tenantId, query),
        queryFn: async ({ signal }) => (await api.search.universal(query, signal)).data,
        staleTime: 15_000,
    });
