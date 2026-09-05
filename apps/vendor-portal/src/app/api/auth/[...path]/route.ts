import { createApiProxy, upstreamAuthUrl } from '@/lib/api/proxy';

/**
 * Better Auth owns its own routing under this prefix, so no root allowlist applies here.
 * The proxy keeps the client same-origin and forwards every session cookie it issues.
 */
const proxyRequest = createApiProxy({ upstreamBaseUrl: upstreamAuthUrl });

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
