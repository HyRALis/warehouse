import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MembersPage from './page';

const mocks = vi.hoisted(() => ({
    getVendorMembers: vi.fn(),
    updateVendorMemberAccess: vi.fn(),
    listInvitations: vi.fn(),
    inviteMember: vi.fn(),
    cancelInvitation: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        platform: {
            organization: { id: 'org-1', name: 'Studio' },
            membership: { isOwner: true },
        },
    }),
}));
vi.mock('@/lib/api', () => ({
    api: {
        getVendorMembers: mocks.getVendorMembers,
        updateVendorMemberAccess: mocks.updateVendorMemberAccess,
    },
}));
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        organization: {
            listInvitations: mocks.listInvitations,
            inviteMember: mocks.inviteMember,
            cancelInvitation: mocks.cancelInvitation,
        },
    },
}));

const members = [
    {
        id: 'owner-member',
        role: 'owner',
        createdAt: '2026-01-01',
        user: { id: 'owner', name: 'Owner', email: 'owner@example.test', image: null },
        vendorPortalAccess: { granted: true, implicit: true, record: null },
    },
    {
        id: 'regular-member',
        role: 'member',
        createdAt: '2026-01-02',
        user: { id: 'member', name: 'Member', email: 'member@example.test', image: null },
        vendorPortalAccess: { granted: true, implicit: false, record: null },
    },
];

describe('MembersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getVendorMembers.mockResolvedValue({ success: true, data: members });
        mocks.listInvitations.mockResolvedValue({
            data: [
                {
                    id: 'invite-1',
                    organizationId: 'org-1',
                    email: 'pending@example.test',
                    role: 'member',
                    status: 'pending',
                    expiresAt: '2030-01-01T00:00:00.000Z',
                },
            ],
            error: null,
        });
        mocks.updateVendorMemberAccess.mockResolvedValue({ success: true });
        mocks.inviteMember.mockResolvedValue({ data: { id: 'invite-2' }, error: null });
        mocks.cancelInvitation.mockResolvedValue({ data: { id: 'invite-1' }, error: null });
    });

    it('protects Owner access and lets an Owner revoke a regular member', async () => {
        const user = userEvent.setup();
        render(<MembersPage />);

        expect(await screen.findByText(/owner@example\.test/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Owner access' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Revoke portal access' }));

        expect(mocks.updateVendorMemberAccess).toHaveBeenCalledWith('regular-member', false);
        await waitFor(() => expect(mocks.getVendorMembers).toHaveBeenCalledTimes(2));
    });

    it('resends and cancels pending invitations through Better Auth', async () => {
        const user = userEvent.setup();
        render(<MembersPage />);
        expect(await screen.findByText('pending@example.test')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Resend' }));
        expect(mocks.inviteMember).toHaveBeenCalledWith({
            email: 'pending@example.test',
            role: 'member',
            organizationId: 'org-1',
            resend: true,
        });
    });
});
