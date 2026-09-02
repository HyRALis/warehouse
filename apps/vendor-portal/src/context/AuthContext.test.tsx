import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    listOrganizations: vi.fn(),
    setActive: vi.fn(),
    signOut: vi.fn(),
    getPlatformContext: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        getSession: mocks.getSession,
        signOut: mocks.signOut,
        organization: { list: mocks.listOrganizations, setActive: mocks.setActive },
    },
}));

vi.mock('@/lib/api', () => ({
    ApiError: class ApiError extends Error {
        statusCode = 403;
    },
    api: {
        getPlatformContext: mocks.getPlatformContext,
        login: mocks.login,
        register: mocks.register,
    },
}));

const platform = {
    organization: { id: 'org-1', name: 'Studio One', slug: 'studio-one', logo: null },
    membership: { id: 'member-1', role: 'owner', isOwner: true },
    portal: {
        key: 'vendor' as const,
        subscription: {
            status: 'ACTIVE' as const,
            startsAt: '2026-01-01',
            endsAt: null,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            active: true,
        },
        access: { granted: true, implicit: true, record: null },
    },
    vendorProfile: {
        id: 'profile-1',
        profileKey: 'primary' as const,
        displayName: 'Studio One',
        description: null,
        websiteUrl: null,
        logoUrl: null,
    },
};

function Probe() {
    const auth = useAuth();
    return (
        <div>
            <span>{auth.loading ? 'loading' : auth.user?.email || 'signed-out'}</span>
            <span>{auth.platform?.vendorProfile?.displayName}</span>
            <span>{auth.organizations.length}</span>
            <button onClick={() => auth.switchOrganization('org-2')}>Switch</button>
            <button
                onClick={async () => {
                    const result = await auth.login('owner@example.test', 'password');
                    document.body.dataset.twoFactor = String(result.twoFactorRequired);
                }}
            >
                Login
            </button>
        </div>
    );
}

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete document.body.dataset.twoFactor;
        mocks.getSession.mockResolvedValue({
            data: {
                user: {
                    id: 'user-1',
                    name: 'Owner',
                    email: 'owner@example.test',
                    emailVerified: true,
                },
                session: { id: 'session-1' },
            },
        });
        mocks.listOrganizations.mockResolvedValue({
            data: [
                { id: 'org-1', name: 'Studio One', slug: 'studio-one' },
                { id: 'org-2', name: 'Studio Two', slug: 'studio-two' },
            ],
        });
        mocks.getPlatformContext.mockResolvedValue({ success: true, data: platform });
        mocks.setActive.mockResolvedValue({ data: { id: 'org-2' }, error: null });
        mocks.signOut.mockResolvedValue({ data: { success: true } });
    });

    it('hydrates the person, organizations, and active Vendor Profile from secure session state', async () => {
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );

        expect(await screen.findByText('owner@example.test')).toBeInTheDocument();
        expect(screen.getByText('Studio One')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('switches the active organization before refreshing platform context', async () => {
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );
        await screen.findByText('owner@example.test');

        await user.click(screen.getByRole('button', { name: 'Switch' }));

        expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: 'org-2' });
        await waitFor(() => expect(mocks.getPlatformContext).toHaveBeenCalledTimes(2));
    });

    it('returns the two-factor challenge without pretending a session exists', async () => {
        mocks.login.mockResolvedValue({
            success: true,
            data: { twoFactorRequired: true, twoFactorMethods: ['totp'] },
        });
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );
        await screen.findByText('owner@example.test');

        await act(async () => user.click(screen.getByRole('button', { name: 'Login' })));

        expect(document.body.dataset.twoFactor).toBe('true');
    });
});
