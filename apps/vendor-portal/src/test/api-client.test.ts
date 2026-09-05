import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { currentVendorApiResponseSchema } from '@inventory-system/contracts';
import { ApiError, createApiClient, getFieldIssue } from '@/lib/api/client';
import { server } from './test-server';

const client = createApiClient('http://localhost/api/v1');

describe('schema-aware API client', () => {
    it('parses valid responses', async () => {
        server.use(http.get('http://localhost/api/v1/auth/me', () => HttpResponse.json({ success: true, data: { id: 'v1', email: 'vendor@example.com', companyName: 'Acme', createdAt: '2026-08-29T10:00:00.000Z' } })));
        await expect(client.request('/auth/me', currentVendorApiResponseSchema)).resolves.toMatchObject({ data: { id: 'v1' } });
    });

    it('rejects malformed successful payloads', async () => {
        server.use(http.get('http://localhost/api/v1/auth/me', () => HttpResponse.json({ success: true, data: { id: 42 } })));
        await expect(client.request('/auth/me', currentVendorApiResponseSchema)).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE', statusCode: 502 });
    });

    it('throws typed API errors with field issues', async () => {
        server.use(http.get('http://localhost/api/v1/auth/me', () => HttpResponse.json({ success: false, message: 'Session expired', code: 'UNAUTHORIZED', statusCode: 401, issues: [{ path: ['email'], message: 'Invalid' }] }, { status: 401 })));
        const error = await client.request('/auth/me', currentVendorApiResponseSchema).catch((cause: unknown) => cause);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ statusCode: 401, issues: [{ path: ['email'] }] });
    });

    it('maps server issue paths to form field names', () => {
        const error = new ApiError('Invalid', 400, 'VALIDATION_ERROR', undefined, [
            { path: ['body', 'characteristics', 0, 'value'], message: 'Value is required' },
        ]);
        expect(getFieldIssue(error, 'characteristics[0].value')).toBe('Value is required');
    });
});
