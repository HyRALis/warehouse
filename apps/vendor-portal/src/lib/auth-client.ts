'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { API_ORIGIN } from './api';

export const authClient = createAuthClient({
    baseURL: API_ORIGIN,
    plugins: [organizationClient(), twoFactorClient()],
    fetchOptions: { credentials: 'include' },
});
