import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/products',
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('./UniversalSearch', () => ({ default: () => <button>Search catalog</button> }));
vi.mock('./OrganizationSwitcher', () => ({ default: () => null }));
vi.mock('./QuickCreateMenu', () => ({ default: () => null }));

describe('Header mobile navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useAuth.mockReturnValue({
            user: { email: 'owner@example.test' },
            platform: {
                membership: { isOwner: true },
                vendorProfile: { displayName: 'Studio One' },
            },
            logout: vi.fn(),
        });
    });

    it('traps focus, marks the current page, and restores the menu trigger on Escape', async () => {
        const user = userEvent.setup();
        render(<Header />);
        const trigger = screen.getByRole('button', { name: 'Open navigation' });

        await user.click(trigger);

        const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' });
        const close = screen.getByRole('button', { name: 'Close navigation' });
        await waitFor(() => expect(close).toHaveFocus());
        expect(screen.getByRole('link', { name: 'Products Catalog' })).toHaveAttribute(
            'aria-current',
            'page'
        );

        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Log out' })).toHaveFocus();
        await user.tab();
        expect(close).toHaveFocus();
        expect(dialog).toBeInTheDocument();

        await user.keyboard('{Escape}');
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    });
});
