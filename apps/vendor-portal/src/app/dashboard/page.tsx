import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { requireVendor } from '@/features/auth/server';
import { DashboardView } from '@/features/dashboard/components/DashboardView';
import { dashboardQueryOptions } from '@/features/dashboard/query-options';
import { createServerApi } from '@/lib/api/server';
import { getQueryClient } from '@/lib/query/query-client';

export default async function DashboardOverview() {
    const [vendor, api] = await Promise.all([requireVendor(), createServerApi()]);
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(dashboardQueryOptions(api, vendor.id));
    return <HydrationBoundary state={dehydrate(queryClient)}><DashboardView /></HydrationBoundary>;
}
