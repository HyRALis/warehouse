import {
    MutationCache,
    QueryCache,
    QueryClient,
    isServer,
    type QueryClientConfig,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

const shouldRetry = (failureCount: number, error: unknown): boolean =>
    failureCount < 1 && (!(error instanceof ApiError) || error.statusCode >= 500);

export const createQueryClient = (
    onUnauthorized?: () => void,
    overrides: QueryClientConfig = {}
) =>
    new QueryClient({
        queryCache: new QueryCache({
            onError: (error) => {
                if (error instanceof ApiError && error.statusCode === 401) onUnauthorized?.();
            },
        }),
        mutationCache: new MutationCache({
            onError: (error) => {
                if (error instanceof ApiError && error.statusCode === 401) onUnauthorized?.();
            },
        }),
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                retry: shouldRetry,
                refetchOnWindowFocus: true,
            },
            mutations: { retry: false },
            dehydrate: { shouldDehydrateQuery: (query) => query.state.status === 'success' },
        },
        ...overrides,
    });

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = (): QueryClient => {
    if (isServer) return createQueryClient();
    browserQueryClient ??= createQueryClient();
    return browserQueryClient;
};
