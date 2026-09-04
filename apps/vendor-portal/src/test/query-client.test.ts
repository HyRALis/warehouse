import { dehydrate, hydrate } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { tenantKeys } from '@/features/query-keys';
import { createQueryClient } from '@/lib/query/query-client';

describe('Query policy', () => {
    it('does not retry expected 4xx failures', async () => {
        const queryFn = vi.fn().mockRejectedValue(new ApiError('Invalid', 400, 'BAD_REQUEST'));
        const client = createQueryClient();
        await expect(client.fetchQuery({ queryKey: ['bad-request'], queryFn })).rejects.toMatchObject({ statusCode: 400 });
        expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('hydrates fresh server data without a duplicate fetch', async () => {
        const serverClient = createQueryClient();
        await serverClient.prefetchQuery({ queryKey: ['vendor'], queryFn: async () => ({ id: 'v1' }) });
        const browserClient = createQueryClient();
        hydrate(browserClient, dehydrate(serverClient));
        const queryFn = vi.fn().mockResolvedValue({ id: 'v1' });
        const value = await browserClient.fetchQuery({ queryKey: ['vendor'], queryFn, staleTime: 30_000 });
        expect(value).toEqual({ id: 'v1' });
        expect(queryFn).not.toHaveBeenCalled();
    });

    it('scopes product caches by tenant and normalized filters', () => {
        expect(tenantKeys.productList('tenant-a', { page: 1, limit: 12 })).not.toEqual(tenantKeys.productList('tenant-b', { page: 1, limit: 12 }));
    });

    it('routes expired sessions through the central unauthorized handler', async () => {
        const onUnauthorized = vi.fn();
        const client = createQueryClient(onUnauthorized);
        await expect(client.fetchQuery({ queryKey: ['expired'], queryFn: async () => { throw new ApiError('Expired', 401, 'UNAUTHORIZED'); } })).rejects.toBeInstanceOf(ApiError);
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
});
