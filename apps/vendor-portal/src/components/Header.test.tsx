import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render-with-providers';
import { server } from '@/test/test-server';
import { DashboardShell } from './layout/DashboardShell';

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/products',
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('Header mobile navigation', () => {
    it('opens the shared navigation sheet and restores the trigger after Escape', async () => {
        server.use(
            http.get('*/api/auth/organization/list', () => HttpResponse.json([])),
            http.get('*/api/v1/platform/context', () => HttpResponse.json({ success: false, statusCode: 403, code: 'FORBIDDEN', message: 'Unavailable' }, { status: 403 })),
        );
        const user = userEvent.setup();
        renderWithProviders(<DashboardShell>Product catalog</DashboardShell>);
        const trigger = screen.getByRole('button', { name: 'Open navigation' });
        await user.click(trigger);
        const dialog = screen.getByRole('dialog', { name: 'Vendor portal navigation' });
        expect(within(dialog).getByRole('link', { name: 'Products Catalog' })).toHaveAttribute('aria-current', 'page');
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await user.keyboard('{Escape}');
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
