import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { requireVendor } from '@/features/auth/server';
import { categoriesQueryOptions } from '@/features/categories/query-options';
import { ProductCreateView } from '@/features/products/components/ProductCreateView';
import { templatesQueryOptions } from '@/features/templates/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

export default async function NewProductPage() {
    const [vendor, api] = await Promise.all([requireVendor(), createServerApi()]);
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery(categoriesQueryOptions(api, vendor.id)),
        queryClient.prefetchQuery(templatesQueryOptions(api, vendor.id)),
    ]);
    return <HydrationBoundary state={dehydrate(queryClient)}><ProductCreateView /></HydrationBoundary>;
}
