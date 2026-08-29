'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { UpdateVendorRequest } from '@inventory-system/contracts';
import { useToast } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { sessionQueryKey } from '@/features/auth/query-options';

export const useUpdateVendor = () => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (body: UpdateVendorRequest) => browserApi.vendors.update(body),
        onSuccess: ({ data }) => {
            queryClient.setQueryData(sessionQueryKey, data);
            notify({ title: 'Profile updated', variant: 'success' });
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
