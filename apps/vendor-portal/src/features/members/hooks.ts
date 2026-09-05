'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@inventory-system/ui';
import { authClient, unwrap } from '@/features/auth';
import { browserApi } from '@/lib/api/browser';
import {
    invitationSummaryQueryOptions,
    invitationsQueryOptions,
    memberKeys,
    membersQueryOptions,
} from './query-options';

export const useMembers = (organizationId: string) =>
    useQuery(membersQueryOptions(browserApi, organizationId));

export const useInvitations = (organizationId: string) =>
    useQuery({ ...invitationsQueryOptions(organizationId), enabled: Boolean(organizationId) });

export const useInvitationSummary = (invitationId: string) =>
    useQuery(invitationSummaryQueryOptions(browserApi, invitationId));

export const useUpdateMemberAccess = () => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: ({ memberId, enabled }: { memberId: string; enabled: boolean }) =>
            browserApi.platform.updateMemberAccess(memberId, { enabled }),
        onSuccess: (_result, { enabled }) => {
            void queryClient.invalidateQueries({ queryKey: memberKeys.root });
            notify({
                title: enabled ? 'Portal access granted' : 'Portal access revoked',
                variant: 'success',
            });
        },
    });
};

export const useInviteMember = (organizationId: string) => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: ({ email, resend = false }: { email: string; resend?: boolean }) =>
            unwrap(
                authClient.organization.inviteMember({
                    email: email.trim().toLowerCase(),
                    role: 'member',
                    organizationId,
                    resend,
                }),
                'Unable to send the invitation'
            ),
        onSuccess: (_result, { email, resend }) => {
            void queryClient.invalidateQueries({
                queryKey: memberKeys.invitations(organizationId),
            });
            notify({
                title: resend ? `Invitation resent to ${email}` : `Invitation sent to ${email}`,
                variant: 'success',
            });
        },
    });
};

export const useCancelInvitation = (organizationId: string) => {
    const queryClient = useQueryClient();
    const { notify } = useToast();
    return useMutation({
        mutationFn: (invitationId: string) =>
            unwrap(
                authClient.organization.cancelInvitation({ invitationId }),
                'Unable to cancel the invitation'
            ),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: memberKeys.invitations(organizationId),
            });
            notify({ title: 'Invitation cancelled', variant: 'success' });
        },
    });
};

/**
 * Accepting makes the invited Organization active so the portal reads the right tenant on the
 * next render. Membership alone does not grant portal access; an Owner grants that separately.
 */
export const useAcceptInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            invitationId,
            organizationId,
        }: {
            invitationId: string;
            organizationId: string;
        }) => {
            await unwrap(
                authClient.organization.acceptInvitation({ invitationId }),
                'Unable to accept the invitation'
            );
            await unwrap(
                authClient.organization.setActive({ organizationId }),
                'Unable to activate the organization'
            );
        },
        onSuccess: () => queryClient.invalidateQueries(),
    });
};

export const useCreateInvitedAccount = () =>
    useMutation({
        mutationFn: (values: { email: string; name: string; password: string }) =>
            unwrap(authClient.signUp.email(values), 'Unable to create the invited account'),
    });
