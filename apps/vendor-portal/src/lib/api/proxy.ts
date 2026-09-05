import type { NextRequest } from 'next/server';

/**
 * ADR 002 keeps every browser request same-origin. These handlers are the only place the
 * portal knows the Express origin; the browser always speaks to a relative path.
 */
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1').replace(
    /\/$/,
    ''
);

/** The Better Auth handler is mounted beside `/api/v1`, not underneath it. */
export const upstreamApiUrl = API_INTERNAL_URL;
export const upstreamAuthUrl = `${new URL(API_INTERNAL_URL).origin}/api/auth`;

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const forwardedRequestHeaders = ['accept', 'content-type', 'cookie', 'x-request-id'];
/** `set-cookie` is copied separately: Better Auth can return several in one response. */
const forwardedResponseHeaders = [
    'content-type',
    'content-disposition',
    'x-request-id',
    'retry-after',
];

const jsonError = (status: number, message: string, code: string) =>
    Response.json({ success: false, message, code, statusCode: status }, { status });

export interface ProxyOptions {
    upstreamBaseUrl: string;
    /** When set, only these first path segments are forwarded. */
    allowedRoots?: Set<string>;
}

export const createApiProxy =
    ({ upstreamBaseUrl, allowedRoots }: ProxyOptions) =>
    async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => {
        const { path } = await context.params;
        if (!path.length || (allowedRoots && !allowedRoots.has(path[0]))) {
            return jsonError(404, 'API route not found', 'NOT_FOUND');
        }

        const origin = request.headers.get('origin');
        if (mutatingMethods.has(request.method) && origin && origin !== request.nextUrl.origin) {
            return jsonError(403, 'Cross-origin mutation rejected', 'ORIGIN_REJECTED');
        }

        const upstreamUrl = new URL(`${upstreamBaseUrl}/${path.map(encodeURIComponent).join('/')}`);
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
            for (const value of upstream.headers.getSetCookie?.() ?? []) {
                responseHeaders.append('set-cookie', value);
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
