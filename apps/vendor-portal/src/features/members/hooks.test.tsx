import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@inventory-system/ui';
import { browserApi } from '@/lib/api/browser';
import { useAcceptInvitation, useInviteMember, useMembers } from './hooks';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Better Auth's client is a proxy, so it is replaced at the module boundary rather than spied on.
const organization = vi.hoisted(() => ({
    inviteMember: vi.fn(),
    acceptInvitation: vi.fn(),
    setActive: vi.fn(),
}));

vi.mock('@/features/auth', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/auth')>()),
    authClient: { organization },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
    );
};

describe('member hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        organization.inviteMember.mockResolvedValue({ data: { id: 'invitation-1' }, error: null });
        organization.acceptInvitation.mockResolvedValue({ data: { id: 'member-1' }, error: null });
        organization.setActive.mockResolvedValue({ data: { id: 'org-1' }, error: null });
    });

    it('reads the member list through the inventory API', async () => {
        const members = vi
            .spyOn(browserApi.platform, 'members')
            .mockResolvedValue({ success: true, data: [] });
        const { result } = renderHook(() => useMembers(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(members).toHaveBeenCalledTimes(1);
    });

    it('normalizes an invited address before sending the invitation', async () => {
        const { result } = renderHook(() => useInviteMember('org-1'), { wrapper });

        result.current.mutate({ email: '  Teammate@Example.COM ' });

        await waitFor(() => expect(organization.inviteMember).toHaveBeenCalled());
        expect(organization.inviteMember).toHaveBeenCalledWith({
            email: 'teammate@example.com',
            role: 'member',
            organizationId: 'org-1',
            resend: false,
        });
    });

    it('activates the invited organization only after the invitation is accepted', async () => {
        const { result } = renderHook(() => useAcceptInvitation(), { wrapper });

        result.current.mutate({ invitationId: 'invitation-1', organizationId: 'org-1' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(organization.acceptInvitation).toHaveBeenCalledWith({
            invitationId: 'invitation-1',
        });
        expect(organization.setActive).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('surfaces a Better Auth failure as a rejected mutation', async () => {
        organization.acceptInvitation.mockResolvedValue({
            data: null,
            error: { message: 'Invitation already used' },
        });
        const { result } = renderHook(() => useAcceptInvitation(), { wrapper });

        result.current.mutate({ invitationId: 'invitation-1', organizationId: 'org-1' });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Invitation already used');
        expect(organization.setActive).not.toHaveBeenCalled();
    });
});
