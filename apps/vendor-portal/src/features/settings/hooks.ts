'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { UpdateVendorProfileRequest, UpdateVendorRequest } from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { platformContextQueryKey, sessionQueryKey } from '@/features/auth/query-options';
import { vendorProfileQueryKey, vendorProfileQueryOptions } from './query-options';

export const useVendorProfile = () => useQuery(vendorProfileQueryOptions(browserApi));

export const useUpdateVendor = () => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: UpdateVendorRequest) => browserApi.vendors.update(body),
        onSuccess: ({ data }) => {
            queryClient.setQueryData(sessionQueryKey, data);
            notify({ title: 'Account updated', variant: 'success' });
        },
    });
};

/**
 * The Vendor Profile is the producer identity shown across the portal, so the cached platform
 * context is invalidated alongside it.
 */
export const useUpdateVendorProfile = () => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: UpdateVendorProfileRequest) =>
            browserApi.platform.updateVendorProfile(body),
        onSuccess: ({ data }) => {
            queryClient.setQueryData(vendorProfileQueryKey, data);
            void queryClient.invalidateQueries({ queryKey: platformContextQueryKey });
            notify({ title: 'Vendor Profile updated', variant: 'success' });
        },
    });
};

export const useDeactivateVendor = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn: browserApi.vendors.deactivate,
        onSuccess: () => {
            queryClient.clear();
            router.replace('/login');
        },
    });
};
