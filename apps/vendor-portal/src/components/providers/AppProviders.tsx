'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@inventory-system/ui';
import { createQueryClient } from '@/lib/query/query-client';
import { UiStoreProvider } from '@/state/ui-store';

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const [queryClient] = React.useState(() => {
        let client: ReturnType<typeof createQueryClient>;
        client = createQueryClient(() => {
            client.clear();
            router.replace('/login');
        });
        return client;
    });

    return (
        <QueryClientProvider client={queryClient}>
            <NuqsAdapter>
                <UiStoreProvider>
                    <ToastProvider>{children}</ToastProvider>
                </UiStoreProvider>
            </NuqsAdapter>
        </QueryClientProvider>
    );
};
