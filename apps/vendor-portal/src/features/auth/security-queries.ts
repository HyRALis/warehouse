'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { authClient, unwrap } from './auth-client';
import {
    deviceSessionsQueryKey,
    deviceSessionsQueryOptions,
    identityQueryKey,
} from './query-options';

export interface TwoFactorEnrollment {
    totpURI: string;
    qrCode: string;
    backupCodes: string[];
}

/** Every second-factor change alters the identity record, so the identity query is refetched. */
const useIdentityMutation = <TVariables, TData>(
    mutationFn: (variables: TVariables) => Promise<TData>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: identityQueryKey }),
    });
};

export const useDeviceSessions = () => useQuery(deviceSessionsQueryOptions());

export const useRevokeDeviceSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (token: string) =>
            unwrap(authClient.revokeSession({ token }), 'Unable to revoke the session'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceSessionsQueryKey }),
    });
};

export const useEnableTwoFactor = () =>
    useIdentityMutation(async (password: string): Promise<TwoFactorEnrollment> => {
        const data = await unwrap(
            authClient.twoFactor.enable({ password, method: 'totp' }),
            'Unable to start two-factor enrollment'
        );
        if (!data || !('totpURI' in data)) throw new Error('Unable to start two-factor enrollment');
        return {
            totpURI: data.totpURI,
            qrCode: await QRCode.toDataURL(data.totpURI, { width: 220, margin: 1 }),
            backupCodes: data.backupCodes,
        };
    });

export const useConfirmTwoFactor = () =>
    useIdentityMutation((code: string) =>
        unwrap(
            authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') }),
            'The authenticator code is invalid'
        )
    );

export const useDisableTwoFactor = () =>
    useIdentityMutation((password: string) =>
        unwrap(
            authClient.twoFactor.disable({ password }),
            'Unable to disable two-factor authentication'
        )
    );

export const useRegenerateBackupCodes = () =>
    useIdentityMutation(async (password: string) => {
        const data = await unwrap(
            authClient.twoFactor.generateBackupCodes({ password }),
            'Unable to generate recovery codes'
        );
        return data?.backupCodes ?? [];
    });

/** Sign-in challenge: accepts either an authenticator code or one unused recovery code. */
export const useVerifyTwoFactor = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn: ({ code, mode }: { code: string; mode: 'totp' | 'backup' }) =>
            mode === 'totp'
                ? unwrap(
                      authClient.twoFactor.verifyTotp({
                          code: code.replace(/\s/g, ''),
                          trustDevice: true,
                      }),
                      'The verification code is invalid'
                  )
                : unwrap(
                      authClient.twoFactor.verifyBackupCode({
                          code: code.trim(),
                          trustDevice: true,
                      }),
                      'The recovery code is invalid'
                  ),
        onSuccess: async () => {
            await queryClient.invalidateQueries();
            router.replace('/dashboard');
        },
    });
};

export const useSendVerificationEmail = () =>
    useMutation({
        mutationFn: (email: string) =>
            unwrap(
                authClient.sendVerificationEmail({
                    email,
                    callbackURL: '/dashboard/settings?verified=1',
                }),
                'Unable to send the verification email'
            ),
    });
