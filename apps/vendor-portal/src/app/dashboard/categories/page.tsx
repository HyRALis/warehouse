import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { requireVendor } from '@/features/auth/server';
import { CategoriesView } from '@/features/categories/components/CategoriesView';
import { categoriesQueryOptions } from '@/features/categories/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

export default async function CategoriesPage() {
    const vendor = await requireVendor();
    const api = await createServerApi();
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(categoriesQueryOptions(api, vendor.id));
    return <HydrationBoundary state={dehydrate(queryClient)}><CategoriesView /></HydrationBoundary>;
}
