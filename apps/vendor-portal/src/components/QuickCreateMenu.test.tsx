import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickCreateMenu from './QuickCreateMenu';

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
}));

describe('QuickCreateMenu', () => {
    it('does not trap Tab while the floating menu is closed', async () => {
        const user = userEvent.setup();
        render(<><QuickCreateMenu variant="floating" /><button>Next control</button></>);
        await user.tab();
        expect(screen.getByRole('button', { name: 'Open quick create menu' })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
    });
    it('presents product creation as the primary option and exposes every route', async () => {
        const user = userEvent.setup();
        render(<QuickCreateMenu />);

        await user.click(screen.getByRole('button', { name: 'Open quick create menu' }));

        expect(screen.getByRole('menuitem', { name: /Add Product/ })).toHaveAttribute('href', '/dashboard/products/new');
        expect(screen.getByRole('menuitem', { name: /Add Template/ })).toHaveAttribute('href', '/dashboard/templates?create=true');
        expect(screen.getByRole('menuitem', { name: /Add Category/ })).toHaveAttribute('href', '/dashboard/categories?create=true');
    });

    it('supports arrow navigation, Escape, and focus restoration', async () => {
        const user = userEvent.setup();
        render(<QuickCreateMenu />);
        const trigger = screen.getByRole('button', { name: 'Open quick create menu' });

        await user.click(trigger);
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Add Product/ })).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Add Template/ })).toHaveFocus();
        await user.keyboard('{Escape}');

        await waitFor(() => expect(trigger).toHaveFocus());
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('renders the mobile floating trigger and dismissible sheet', async () => {
        const user = userEvent.setup();
        render(<QuickCreateMenu variant="floating" />);

        await user.click(screen.getByRole('button', { name: 'Open quick create menu' }));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close quick create menu' }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('keeps keyboard focus inside the mobile floating menu', async () => {
        const user = userEvent.setup();
        render(<QuickCreateMenu variant="floating" />);
        const trigger = screen.getByRole('button', { name: 'Open quick create menu' });

        await user.click(trigger);
        await user.tab({ shift: true });
        expect(screen.getByRole('menuitem', { name: /Add Category/ })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: 'Close quick create menu' })).toHaveFocus();
    });
});
