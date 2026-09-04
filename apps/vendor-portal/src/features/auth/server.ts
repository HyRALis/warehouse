import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/lib/api/client';
import { createServerApi } from '@/lib/api/server';

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
