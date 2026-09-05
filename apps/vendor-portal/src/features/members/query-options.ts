import { queryOptions } from '@tanstack/react-query';
import type { InventoryApi } from '@/lib/api/inventory-api';
import { authClient, unwrap } from '@/features/auth';

export const memberKeys = {
    root: ['members'] as const,
    list: (organizationId: string) => [...memberKeys.root, 'list', organizationId] as const,
    invitations: (organizationId: string) =>
        [...memberKeys.root, 'invitations', organizationId] as const,
    invitation: (invitationId: string) =>
        [...memberKeys.root, 'invitation', invitationId] as const,
};

export const membersQueryOptions = (api: InventoryApi, organizationId: string) =>
    queryOptions({
        queryKey: memberKeys.list(organizationId),
        queryFn: async ({ signal }) => (await api.platform.members(signal)).data,
        enabled: Boolean(organizationId),
        staleTime: 0,
    });

/** Invitations are owned by Better Auth, not by the inventory API. */
export const invitationsQueryOptions = (organizationId: string) =>
    queryOptions({
        queryKey: memberKeys.invitations(organizationId),
        staleTime: 0,
        queryFn: async () => {
            const invitations = await unwrap(
                authClient.organization.listInvitations({ query: { organizationId } }),
                'Unable to load pending invitations'
            );
            return (invitations ?? []).filter((invitation) => invitation.status === 'pending');
        },
    });

export const invitationSummaryQueryOptions = (api: InventoryApi, invitationId: string) =>
    queryOptions({
        queryKey: memberKeys.invitation(invitationId),
        staleTime: 0,
        queryFn: async ({ signal }) => (await api.platform.invitationSummary(invitationId, signal)).data,
        enabled: Boolean(invitationId),
        retry: false,
    });
