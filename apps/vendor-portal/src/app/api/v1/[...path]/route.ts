import { createApiProxy, upstreamApiUrl } from '@/lib/api/proxy';

const allowedRoots = new Set([
    'auth',
    'vendors',
    'products',
    'categories',
    'templates',
    'platform',
]);

const proxyRequest = createApiProxy({ upstreamBaseUrl: upstreamApiUrl, allowedRoots });

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
