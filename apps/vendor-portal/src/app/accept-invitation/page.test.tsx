import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptInvitationPage from './page';

const mocks = vi.hoisted(() => ({
    getInvitationSummary: vi.fn(),
    acceptInvitation: vi.fn(),
    setActive: vi.fn(),
    signUp: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('invitationId=invite-1'),
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { email: 'member@example.test' },
        refresh: mocks.refresh,
    }),
}));
vi.mock('@/lib/api', () => ({
    api: { getInvitationSummary: mocks.getInvitationSummary },
}));
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        signUp: { email: mocks.signUp },
        organization: {
            acceptInvitation: mocks.acceptInvitation,
            setActive: mocks.setActive,
        },
    },
}));

describe('AcceptInvitationPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getInvitationSummary.mockResolvedValue({
            data: {
                id: 'invite-1',
                email: 'member@example.test',
                organizationId: 'org-1',
                organizationName: 'Studio One',
                inviterEmail: 'owner@example.test',
                status: 'pending',
                expiresAt: '2030-01-01T00:00:00.000Z',
            },
        });
        mocks.acceptInvitation.mockResolvedValue({ data: { status: true }, error: null });
        mocks.setActive.mockResolvedValue({ data: { id: 'org-1' }, error: null });
        mocks.refresh.mockResolvedValue(undefined);
    });

    it('accepts the invitation and activates its Organization', async () => {
        const user = userEvent.setup();
        render(<AcceptInvitationPage />);
        expect(await screen.findByText('Studio One')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Accept invitation' }));

        expect(mocks.acceptInvitation).toHaveBeenCalledWith({ invitationId: 'invite-1' });
        expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: 'org-1' });
        expect(await screen.findByText('Invitation accepted')).toBeInTheDocument();
    });

    it('shows a recoverable error for an expired invitation', async () => {
        mocks.getInvitationSummary.mockResolvedValueOnce({
            data: {
                id: 'invite-1',
                email: 'member@example.test',
                organizationId: 'org-1',
                organizationName: 'Studio One',
                status: 'pending',
                expiresAt: '2020-01-01T00:00:00.000Z',
            },
        });
        render(<AcceptInvitationPage />);
        expect(await screen.findByText(/expired or has already been used/i)).toBeInTheDocument();
    });
});
