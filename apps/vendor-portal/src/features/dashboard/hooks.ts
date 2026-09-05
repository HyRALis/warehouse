'use client';

import { useQuery } from '@tanstack/react-query';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { dashboardQueryOptions } from './query-options';

export const useDashboardStats = () => {
    const { data: vendor } = useCurrentVendor();
    return useQuery({
        ...dashboardQueryOptions(browserApi, vendor?.id || 'pending'),
        enabled: Boolean(vendor),
    });
};
