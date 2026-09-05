'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';

/**
 * Better Auth owns second factors, organization membership, and device sessions. ADR 002 keeps
 * the browser same-origin, so the client talks to the portal's `/api/auth` proxy rather than to
 * the Express origin directly; `baseURL` is left unset so it resolves to the current origin.
 */
export const authClient = createAuthClient({
    basePath: '/api/auth',
    plugins: [organizationClient(), twoFactorClient()],
    fetchOptions: { credentials: 'include' },
});

/** Better Auth returns `{ data, error }` rather than throwing, so unwrap it into Query's model. */
export const unwrap = async <T>(
    result: Promise<{ data: T | null; error?: { message?: string } | null }>,
    fallbackMessage: string
): Promise<T> => {
    const { data, error } = await result;
    if (error) throw new Error(error.message || fallbackMessage);
    return data as T;
};
