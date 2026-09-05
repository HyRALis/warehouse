'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    isTwoFactorChallenge,
    type ForgotPasswordRequest,
    type LoginVendorRequest,
    type RegisterVendorRequest,
    type ResetPasswordRequest,
} from '@inventory-system/contracts';
import { browserApi } from '@/lib/api/browser';
import { authClient } from './auth-client';
import { safeReturnTo } from './utils/return-to';
import {
    currentVendorQueryOptions,
    identityQueryOptions,
    organizationsQueryOptions,
    platformContextQueryOptions,
    sessionQueryKey,
} from './query-options';

export const useCurrentVendor = () => useQuery(currentVendorQueryOptions(browserApi));

/** Account-security facts (`emailVerified`, `twoFactorEnabled`) owned by Better Auth. */
export const useAuthIdentity = () => {
    const session = useQuery(identityQueryOptions());
    return { ...session, user: session.data?.user ?? null };
};

export const useOrganizations = () => useQuery(organizationsQueryOptions());

export const usePlatformContext = () => useQuery(platformContextQueryOptions(browserApi));

/**
 * `returnTo` survives the second-factor hop, so an invitation link that required a sign-in
 * lands back on the invitation rather than the dashboard.
 */
export const useLogin = (returnTo?: string | null) => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const destination = safeReturnTo(returnTo);
    return useMutation({
        mutationFn: (values: LoginVendorRequest) => browserApi.auth.login(values),
        onSuccess: ({ data }) => {
            if (isTwoFactorChallenge(data)) {
                router.push(`/two-factor?returnTo=${encodeURIComponent(destination)}`);
                return;
            }
            queryClient.setQueryData(sessionQueryKey, data.vendor);
            router.replace(destination);
        },
    });
};

export const useRegister = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn: (values: RegisterVendorRequest) => browserApi.auth.register(values),
        onSuccess: ({ data }) => {
            if (!isTwoFactorChallenge(data)) queryClient.setQueryData(sessionQueryKey, data.vendor);
            router.replace('/verify-email?sent=1');
        },
    });
};

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

export const useForgotPassword = () =>
    useMutation({
        mutationFn: (values: ForgotPasswordRequest) => browserApi.auth.forgotPassword(values),
    });

export const useResetPassword = () =>
    useMutation({
        mutationFn: (values: ResetPasswordRequest) => browserApi.auth.resetPassword(values),
    });

export const useSwitchOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (organizationId: string) => {
            const { error } = await authClient.organization.setActive({ organizationId });
            if (error) throw new Error(error.message || 'Organization switch failed');
        },
        onSuccess: () => queryClient.invalidateQueries(),
    });
};
