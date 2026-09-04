import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PortalUnavailable } from '@/features/auth';
import {
    getPlatformContext,
    portalAccessDenial,
    requireVendor,
} from '@/features/auth/server';
import { platformContextQueryKey, sessionQueryKey } from '@/features/auth/query-options';
import { getQueryClient } from '@/lib/query/query-client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const vendor = await requireVendor();
    const { context, error } = await getPlatformContext();

    const denial = error ?? portalAccessDenial(context);
    if (denial) return <PortalUnavailable reason={denial} />;

    const queryClient = getQueryClient();
    queryClient.setQueryData(sessionQueryKey, vendor);
    queryClient.setQueryData(platformContextQueryKey, context);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DashboardShell>{children}</DashboardShell>
        </HydrationBoundary>
    );
}
