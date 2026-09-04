import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';

export const vendorProfileQueryKey = ['settings', 'vendor-profile'] as const;

export const vendorProfileQueryOptions = (api: InventoryApi) =>
    queryOptions({
        queryKey: vendorProfileQueryKey,
        queryFn: async ({ signal }) => (await api.platform.vendorProfile(signal)).data,
        staleTime: 5 * 60_000,
    });
