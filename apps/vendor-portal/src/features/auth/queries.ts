'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type {
    LoginVendorRequest,
    RegisterVendorRequest,
    Vendor,
} from '@inventory-system/contracts';
import { browserApi } from '@/lib/api/browser';
import { currentVendorQueryOptions, sessionQueryKey } from './query-options';

export const useCurrentVendor = () => useQuery(currentVendorQueryOptions(browserApi));

const useAuthenticate = (
    mutationFn: (values: LoginVendorRequest | RegisterVendorRequest) => Promise<{ data: { vendor: Vendor } }>
) => {
    const queryClient = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn,
        onSuccess: ({ data }) => {
            queryClient.setQueryData(sessionQueryKey, data.vendor);
            router.replace('/dashboard');
        },
    });
};

export const useLogin = () =>
    useAuthenticate((values) => browserApi.auth.login(values as LoginVendorRequest));

export const useRegister = () =>
    useAuthenticate((values) => browserApi.auth.register(values as RegisterVendorRequest));

export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn: browserApi.auth.logout,
        onSettled: () => {
            queryClient.clear();
            router.replace('/login');
        },
    });
};
