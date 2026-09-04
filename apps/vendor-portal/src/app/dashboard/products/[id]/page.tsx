import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { requireVendor } from '@/features/auth/server';
import { ProductDetailView } from '@/features/products/components/ProductDetailView';
import { productQueryOptions } from '@/features/products/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [{ id }, vendor, api] = await Promise.all([params, requireVendor(), createServerApi()]);
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(productQueryOptions(api, vendor.id, id));
    return <HydrationBoundary state={dehydrate(queryClient)}><ProductDetailView productId={id} /></HydrationBoundary>;
}
