import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { requireVendor } from '@/features/auth/server';
import { TemplatesView } from '@/features/templates/components/TemplatesView';
import { templatesQueryOptions } from '@/features/templates/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

export default async function TemplatesPage() {
    const vendor = await requireVendor();
    const api = await createServerApi();
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(templatesQueryOptions(api, vendor.id));
    return <HydrationBoundary state={dehydrate(queryClient)}><TemplatesView /></HydrationBoundary>;
}
