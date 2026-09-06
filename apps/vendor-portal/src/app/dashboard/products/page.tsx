import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { productListQuerySchema } from '@inventory-system/contracts';
import { requireVendor } from '@/features/auth/server';
import { ProductsView } from '@/features/products/components/ProductsView';
import { productsQueryOptions } from '@/features/products/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
    const [vendor, rawSearchParams, api] = await Promise.all([requireVendor(), searchParams, createServerApi()]);
    const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
    const filters = productListQuerySchema.parse({ page: first(rawSearchParams.page), limit: 12, search: first(rawSearchParams.search), status: first(rawSearchParams.status) });
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(productsQueryOptions(api, vendor.id, filters));
    return <HydrationBoundary state={dehydrate(queryClient)}><ProductsView /></HydrationBoundary>;
}
