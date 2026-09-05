import 'server-only';

import { cookies } from 'next/headers';
import { createApiClient } from './client';
import { createInventoryApi } from './inventory-api';

const API_INTERNAL_URL = (
    process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1'
).replace(/\/$/, '');

export const createServerApi = async () => {
    const cookieStore = await cookies();
    return createInventoryApi(
        createApiClient(API_INTERNAL_URL, {
            cookie: cookieStore.toString(),
        })
    );
};
