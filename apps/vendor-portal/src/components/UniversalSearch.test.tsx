import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UniversalSearch from './UniversalSearch';
import { api } from '@/lib/api';

const push = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
    api: { universalSearch: vi.fn() },
}));

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

describe('UniversalSearch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.universalSearch).mockResolvedValue(searchResponse);
    });

    it('opens with Ctrl+K, focuses the combobox, and closes with Escape', async () => {
        render(<UniversalSearch />);

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        const input = await screen.findByRole('combobox');
        await waitFor(() => expect(input).toHaveFocus());

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('also opens with Cmd+K', async () => {
        render(<UniversalSearch />);

        fireEvent.keyDown(window, { key: 'K', metaKey: true });
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('debounces suggestions and follows the active deep link with Enter', async () => {
        const user = userEvent.setup();
        render(<UniversalSearch />);

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'hoodie');

        expect(
            await screen.findByRole('option', { name: /^creator hoodie/i })
        ).toBeInTheDocument();
        expect(api.universalSearch).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'hoodie', mode: 'suggestions' }),
            expect.any(AbortSignal)
        );

        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
        expect(push).toHaveBeenCalledWith(
            '/dashboard/products/product-1?version=version-1'
        );
    });

    it('cancels the stale request when the query changes', async () => {
        const signals: AbortSignal[] = [];
        vi.mocked(api.universalSearch).mockImplementation((_params, signal) => {
            signals.push(signal as AbortSignal);
            return new Promise(() => undefined);
        });
        const user = userEvent.setup();
        render(<UniversalSearch />);

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'hood');
        await waitFor(() => expect(signals).toHaveLength(1));
        await user.type(screen.getByRole('combobox'), 'ie');

        await waitFor(() => expect(signals[0].aborted).toBe(true));
    });

    it('opens the full results page with the current query', async () => {
        const user = userEvent.setup();
        render(<UniversalSearch />);

        await user.click(screen.getByRole('button', { name: /search products/i }));
        await user.type(screen.getByRole('combobox'), 'creator hoodie');
        await user.click(await screen.findByRole('button', { name: /see all results/i }));

        expect(push).toHaveBeenCalledWith('/dashboard/search?q=creator%20hoodie');
    });
});
