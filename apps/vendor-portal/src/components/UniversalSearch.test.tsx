import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vendor } from '@inventory-system/contracts';
import { sessionQueryKey } from '@/features/auth/query-options';
import { browserApi } from '@/lib/api/browser';
import UniversalSearch from './UniversalSearch';

const push = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}));

const vendor: Vendor = {
    id: 'vendor-1',
    email: 'vendor@example.com',
    companyName: 'Acme',
    createdAt: '2026-08-29T10:00:00.000Z',
};

const searchResponse = {
    query: 'hoodie',
    mode: 'suggestions' as const,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
    tookMs: 3.2,
    data: [],
    groups: [
        {
            type: 'product' as const,
            label: 'Products',
            results: [
                {
                    type: 'product' as const,
                    id: 'product-1',
                    title: 'Creator Hoodie',
                    subtitle: 'HOODIE-001 · Hoodies',
                    href: '/dashboard/products/product-1',
                    score: 1200,
                    matchedField: 'sku',
                    context: { sku: 'HOODIE-001' },
                },
            ],
        },
        {
            type: 'version' as const,
            label: 'Product versions',
            results: [
                {
                    type: 'version' as const,
                    id: 'version-1',
                    title: 'Midnight Drop',
                    subtitle: 'Creator Hoodie · HOODIE-MIDNIGHT',
                    href: '/dashboard/products/product-1?version=version-1',
                    score: 1100,
                    matchedField: 'version label',
                    context: { productId: 'product-1', productName: 'Creator Hoodie' },
                },
            ],
        },
    ],
};

const renderSearch = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(sessionQueryKey, vendor);
    return render(
        <QueryClientProvider client={queryClient}>
            <UniversalSearch />
        </QueryClientProvider>
    );
};

describe('UniversalSearch', () => {
    it('lets Enter activate Close search instead of opening the highlighted result', async () => {
        const user = userEvent.setup();
        renderSearch();
        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'hoodie');
        await screen.findByRole('option', { name: /^creator hoodie/i });
        await user.tab();
        expect(screen.getByRole('button', { name: 'Close search' })).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
    });

    it('restores focus when the shortcut closes search', async () => {
        const user = userEvent.setup();
        renderSearch();
        await user.keyboard('{Control>}k{/Control}');
        await screen.findByRole('combobox');
        await user.keyboard('{Control>}k{/Control}');
        await waitFor(() => expect(screen.getByRole('button', { name: /search products/i })).toHaveFocus());
    });
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(browserApi.search, 'universal').mockResolvedValue({
            success: true,
            data: searchResponse,
        });
    });

    it('opens with Ctrl+K, focuses the combobox, and closes with Escape', async () => {
        renderSearch();

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        const input = await screen.findByRole('combobox');
        await waitFor(() => expect(input).toHaveFocus());

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('also opens with Cmd+K', async () => {
        renderSearch();

        fireEvent.keyDown(window, { key: 'K', metaKey: true });
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('requests suggestions and follows the active deep link with Enter', async () => {
        const user = userEvent.setup();
        renderSearch();

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'hoodie');

        expect(
            await screen.findByRole('option', { name: /^creator hoodie/i })
        ).toBeInTheDocument();
        expect(browserApi.search.universal).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'hoodie', mode: 'suggestions' }),
            expect.any(AbortSignal)
        );

        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
        expect(push).toHaveBeenCalledWith('/dashboard/products/product-1?version=version-1');
    });

    it('debounces rapid typing into a single request', async () => {
        const user = userEvent.setup();
        renderSearch();

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'hoodie');

        await screen.findByRole('option', { name: /^creator hoodie/i });
        await waitFor(() =>
            expect(browserApi.search.universal).toHaveBeenCalledWith(
                expect.objectContaining({ q: 'hoodie' }),
                expect.any(AbortSignal)
            )
        );
        // Six keystrokes must not produce six round trips.
        expect(vi.mocked(browserApi.search.universal).mock.calls.length).toBeLessThan(3);
    });

    it('does not search below the minimum query length', async () => {
        const user = userEvent.setup();
        renderSearch();

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'h');

        await waitFor(() => expect(browserApi.search.universal).not.toHaveBeenCalled());
    });

    it('opens the full results page with the current query', async () => {
        const user = userEvent.setup();
        renderSearch();

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'creator hoodie');
        await user.click(await screen.findByRole('button', { name: /see all results/i }));

        expect(push).toHaveBeenCalledWith('/dashboard/search?q=creator%20hoodie');
    });
});
