import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export const templatesQueryOptions = (api: InventoryApi, tenantId: string) =>
    queryOptions({
        queryKey: tenantKeys.templates(tenantId),
        queryFn: async ({ signal }) => (await api.templates.list(signal)).data,
        staleTime: 30_000,
    });
