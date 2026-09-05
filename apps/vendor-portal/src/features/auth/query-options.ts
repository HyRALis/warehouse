import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { authClient, unwrap } from './auth-client';

export const sessionQueryKey = ['session', 'vendor'] as const;
export const identityQueryKey = ['session', 'identity'] as const;
export const organizationsQueryKey = ['session', 'organizations'] as const;
export const deviceSessionsQueryKey = ['session', 'devices'] as const;
export const platformContextQueryKey = ['session', 'platform-context'] as const;

export const currentVendorQueryOptions = (api: InventoryApi) =>
    queryOptions({
        queryKey: sessionQueryKey,
        queryFn: async ({ signal }) => (await api.auth.current(signal)).data,
        staleTime: 5 * 60_000,
        retry: false,
    });

/**
 * The vendor record carries catalog identity; the Better Auth identity carries account security
 * facts (`emailVerified`, `twoFactorEnabled`). They come from different stores, so they are
 * cached separately rather than stitched into one shape.
 */
export const identityQueryOptions = () =>
    queryOptions({
        queryKey: identityQueryKey,
        queryFn: async () => (await authClient.getSession()).data ?? null,
        staleTime: 5 * 60_000,
        retry: false,
    });

export const organizationsQueryOptions = () =>
    queryOptions({
        queryKey: organizationsQueryKey,
        queryFn: () => unwrap(authClient.organization.list(), 'Unable to load organizations'),
        staleTime: 5 * 60_000,
        retry: false,
    });

export const deviceSessionsQueryOptions = () =>
    queryOptions({
        queryKey: deviceSessionsQueryKey,
        queryFn: () => unwrap(authClient.listSessions(), 'Unable to load active sessions'),
        retry: false,
    });

export const platformContextQueryOptions = (api: InventoryApi) =>
    queryOptions({
        queryKey: platformContextQueryKey,
        queryFn: async ({ signal }) => (await api.platform.context(signal)).data,
        staleTime: 5 * 60_000,
        retry: false,
    });
