import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { ToastProvider } from '@inventory-system/ui';
import { sessionQueryKey } from '@/features/auth';

export const renderWithProviders = (view: React.ReactNode, searchParams = '') => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(sessionQueryKey, { id: 'vendor', email: 'vendor@example.com', companyName: 'Studio', createdAt: '2026-09-01T00:00:00.000Z' });
    return { client, ...render(<NuqsTestingAdapter searchParams={searchParams}><QueryClientProvider client={client}><ToastProvider>{view}</ToastProvider></QueryClientProvider></NuqsTestingAdapter>) };
};
