import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/lib/api/client';
import { createServerApi } from '@/lib/api/server';

export { portalAccessDenial } from './utils/portal-access';

export const getCurrentVendor = cache(async () => {
    const api = await createServerApi();
    try {
        return (await api.auth.current()).data;
    } catch (error) {
        if (error instanceof ApiError && [401, 404].includes(error.statusCode)) return null;
        throw error;
    }
});

export const requireVendor = async () => {
    const vendor = await getCurrentVendor();
    if (!vendor) redirect('/login');
    return vendor;
};

export const getPlatformContext = cache(async () => {
    const api = await createServerApi();
    try {
        return { context: (await api.platform.context()).data, error: null as string | null };
    } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) redirect('/login');
        return {
            context: null,
            error:
                error instanceof ApiError
                    ? error.message
                    : 'The Vendor Portal entitlement could not be read.',
        };
    }
});
