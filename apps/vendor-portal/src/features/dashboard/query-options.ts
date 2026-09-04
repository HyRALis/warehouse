import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { tenantKeys } from '@/features/query-keys';

export interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalTemplates: number;
}

export const dashboardQueryOptions = (api: InventoryApi, tenantId: string) =>
    queryOptions({
        queryKey: tenantKeys.dashboard(tenantId),
        queryFn: async ({ signal }): Promise<DashboardStats> => {
            const [allProducts, activeProducts, categories, templates] = await Promise.all([
                api.products.list({ page: 1, limit: 1 }, signal),
                api.products.list({ page: 1, limit: 1, status: 'ACTIVE' }, signal),
                api.categories.list(signal),
                api.templates.list(signal),
            ]);
            return {
                totalProducts: allProducts.meta.total,
                activeProducts: activeProducts.meta.total,
                totalCategories: categories.data.length,
                totalTemplates: templates.data.length,
            };
        },
        staleTime: 30_000,
    });
