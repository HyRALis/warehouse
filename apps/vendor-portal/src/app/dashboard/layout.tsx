import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { requireVendor } from '@/features/auth/server';
import { sessionQueryKey } from '@/features/auth/query-options';
import { getQueryClient } from '@/lib/query/query-client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const vendor = await requireVendor();
    const queryClient = getQueryClient();
    queryClient.setQueryData(sessionQueryKey, vendor);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DashboardShell>{children}</DashboardShell>
        </HydrationBoundary>
    );
}
