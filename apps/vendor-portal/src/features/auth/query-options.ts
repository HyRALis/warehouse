import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';

export const sessionQueryKey = ['session', 'vendor'] as const;

export const currentVendorQueryOptions = (api: InventoryApi) =>
    queryOptions({
        queryKey: sessionQueryKey,
        queryFn: async ({ signal }) => (await api.auth.current(signal)).data,
        staleTime: 5 * 60_000,
        retry: false,
    });
