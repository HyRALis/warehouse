import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: mocks.useAuth }));

const authState = (isOwner: boolean) => ({
    user: { email: 'person@example.test' },
    platform: {
        membership: { isOwner },
        vendorProfile: { displayName: 'Studio One' },
    },
    logout: vi.fn(),
});

describe('Sidebar permissions', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows team access only to Organization Owners', () => {
        mocks.useAuth.mockReturnValue(authState(true));
        const { rerender } = render(<Sidebar />);
        expect(screen.getByRole('link', { name: /team access/i })).toBeInTheDocument();

        mocks.useAuth.mockReturnValue(authState(false));
        rerender(<Sidebar />);
        expect(screen.queryByRole('link', { name: /team access/i })).not.toBeInTheDocument();
    });
});
