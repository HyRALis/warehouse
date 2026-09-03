import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UniversalSearchPage from './page';
import { api } from '@/lib/api';

const push = vi.fn();
let params = new URLSearchParams('q=hoodie&page=2');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    usePathname: () => '/dashboard/search',
    useSearchParams: () => params,
}));

vi.mock('@/lib/api', () => ({
    api: { universalSearch: vi.fn() },
}));

describe('UniversalSearchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        params = new URLSearchParams('q=hoodie&page=2');
        vi.mocked(api.universalSearch).mockResolvedValue({
            query: 'hoodie',
            mode: 'results',
            groups: [],
            data: [
                {
                    type: 'version',
                    id: 'version-1',
                    title: 'Midnight Hoodie',
                    subtitle: 'Creator Hoodie · HOODIE-MIDNIGHT',
                    href: '/dashboard/products/product-1?version=version-1',
                    score: 1200,
                    matchedField: 'sku',
                    context: { productId: 'product-1' },
                },
            ],
            total: 25,
            page: 2,
            limit: 20,
            totalPages: 2,
            tookMs: 4.1,
        });
    });

    it('restores URL query/page state and renders version deep links', async () => {
        render(<UniversalSearchPage />);

        expect(
            await screen.findByRole('link', { name: /midnight hoodie/i })
        ).toBeInTheDocument();
        expect(api.universalSearch).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'hoodie', page: 2, mode: 'results' }),
            expect.any(AbortSignal)
        );
        expect(screen.getByRole('link', { name: /midnight hoodie/i })).toHaveAttribute(
            'href',
            '/dashboard/products/product-1?version=version-1'
        );
    });

    it('persists filters and new queries in the URL', async () => {
        const user = userEvent.setup();
        render(<UniversalSearchPage />);
        await screen.findByRole('link', { name: /midnight hoodie/i });

        await user.click(screen.getByRole('button', { name: 'Products' }));
        expect(push).toHaveBeenCalledWith('/dashboard/search?q=hoodie&types=product');

        const input = screen.getByRole('textbox', { name: 'Search query' });
        await user.clear(input);
        await user.type(input, 'summer drop');
        await user.click(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() =>
            expect(push).toHaveBeenCalledWith('/dashboard/search?q=summer+drop')
        );
    });

    it('writes pagination changes to browser history', async () => {
        const user = userEvent.setup();
        render(<UniversalSearchPage />);
        await screen.findByRole('link', { name: /midnight hoodie/i });

        await user.click(screen.getByRole('button', { name: /previous/i }));
        expect(push).toHaveBeenCalledWith('/dashboard/search?q=hoodie&page=1');
    });

    it('offers a retry when result loading fails', async () => {
        const successfulResponse = {
            query: 'hoodie',
            mode: 'results' as const,
            groups: [],
            data: [
                {
                    type: 'version' as const,
                    id: 'version-1',
                    title: 'Midnight Hoodie',
                    subtitle: 'Creator Hoodie · HOODIE-MIDNIGHT',
                    href: '/dashboard/products/product-1?version=version-1',
                    score: 1200,
                    matchedField: 'sku',
                    context: { productId: 'product-1' },
                },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            tookMs: 4.1,
        };
        vi.mocked(api.universalSearch)
            .mockRejectedValueOnce(new Error('Search is temporarily unavailable'))
            .mockResolvedValueOnce(successfulResponse);
        const user = userEvent.setup();

        render(<UniversalSearchPage />);

        expect(await screen.findByText('Search is temporarily unavailable')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByRole('link', { name: /midnight hoodie/i })).toBeInTheDocument();
        expect(api.universalSearch).toHaveBeenCalledTimes(2);
    });

    it('sanitizes invalid page and entity filters from the URL before searching', async () => {
        params = new URLSearchParams('q=hoodie&page=not-a-page&types=product,unknown');

        render(<UniversalSearchPage />);

        await screen.findByRole('link', { name: /midnight hoodie/i });
        expect(api.universalSearch).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, types: 'product' }),
            expect.any(AbortSignal)
        );
    });
});
