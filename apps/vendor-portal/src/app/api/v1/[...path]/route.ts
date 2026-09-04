import { NextRequest } from 'next/server';

const API_INTERNAL_URL = (
    process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1'
).replace(/\/$/, '');
const allowedRoots = new Set(['auth', 'vendors', 'products', 'categories', 'templates']);
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const forwardedRequestHeaders = ['accept', 'content-type', 'cookie', 'x-request-id'];
const forwardedResponseHeaders = [
    'content-type',
    'content-disposition',
    'set-cookie',
    'x-request-id',
    'retry-after',
];

const jsonError = (status: number, message: string, code: string) =>
    Response.json({ success: false, message, code, statusCode: status }, { status });

const proxyRequest = async (
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) => {
    const { path } = await context.params;
    if (!path.length || !allowedRoots.has(path[0])) {
        return jsonError(404, 'API route not found', 'NOT_FOUND');
    }

    const origin = request.headers.get('origin');
    if (mutatingMethods.has(request.method) && origin && origin !== request.nextUrl.origin) {
        return jsonError(403, 'Cross-origin mutation rejected', 'ORIGIN_REJECTED');
    }

    const upstreamUrl = new URL(`${API_INTERNAL_URL}/${path.map(encodeURIComponent).join('/')}`);
    upstreamUrl.search = request.nextUrl.search;

    const headers = new Headers();
    for (const name of forwardedRequestHeaders) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const body = hasBody ? await request.arrayBuffer() : undefined;

    try {
        const upstream = await fetch(upstreamUrl, {
            method: request.method,
            headers,
            body,
            redirect: 'manual',
            cache: 'no-store',
        });
        const responseHeaders = new Headers();
        for (const name of forwardedResponseHeaders) {
            const value = upstream.headers.get(name);
            if (value) responseHeaders.set(name, value);
        }

        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: responseHeaders,
        });
    } catch {
        return jsonError(502, 'The inventory API is unavailable', 'UPSTREAM_UNAVAILABLE');
    }
};

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
