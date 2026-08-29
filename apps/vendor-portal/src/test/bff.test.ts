import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/v1/[...path]/route';

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('same-origin BFF', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('forwards query strings, cookies, status, and response headers', async () => {
        const upstreamFetch = vi.fn().mockResolvedValue(new Response('{"success":true,"data":[]}', { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'session=abc; HttpOnly', 'x-request-id': 'req-1' } }));
        vi.stubGlobal('fetch', upstreamFetch);
        const response = await GET(new NextRequest('http://localhost/api/v1/products?page=2', { headers: { cookie: 'session=abc' } }), context(['products']));
        const [url, options] = upstreamFetch.mock.calls[0] as [URL, RequestInit];
        expect(url.toString()).toBe('http://localhost:4000/api/v1/products?page=2');
        expect(new Headers(options.headers).get('cookie')).toBe('session=abc');
        expect(response.headers.get('set-cookie')).toContain('session=abc');
        expect(response.headers.get('x-request-id')).toBe('req-1');
    });

    it('rejects unsafe cross-origin mutations', async () => {
        const response = await POST(new NextRequest('http://localhost/api/v1/products', { method: 'POST', headers: { origin: 'https://attacker.example' }, body: '{}' }), context(['products']));
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ code: 'ORIGIN_REJECTED' });
    });

    it('forwards multipart bodies and CSV download headers', async () => {
        const upstreamFetch = vi.fn().mockResolvedValue(new Response('sku,name\nA-1,Example', { headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename=products.csv' } }));
        vi.stubGlobal('fetch', upstreamFetch);
        const multipartBody = '--inventory-boundary\r\nContent-Disposition: form-data; name="file"; filename="products.csv"\r\nContent-Type: text/csv\r\n\r\nsku,name\r\n--inventory-boundary--';
        const request = new NextRequest('http://localhost/api/v1/products/import', {
            method: 'POST',
            headers: { 'content-type': 'multipart/form-data; boundary=inventory-boundary' },
            body: multipartBody,
        });
        const response = await POST(request, context(['products', 'import']));
        const options = upstreamFetch.mock.calls[0][1] as RequestInit;
        expect(new Headers(options.headers).get('content-type')).toContain('multipart/form-data');
        expect(options.body).toBeInstanceOf(ArrayBuffer);
        expect(response.headers.get('content-disposition')).toContain('products.csv');
        await expect(response.text()).resolves.toContain('A-1');
    });

    it('normalizes unreachable upstreams', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        const response = await GET(new NextRequest('http://localhost/api/v1/products'), context(['products']));
        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toMatchObject({ success: false, code: 'UPSTREAM_UNAVAILABLE' });
    });
});
