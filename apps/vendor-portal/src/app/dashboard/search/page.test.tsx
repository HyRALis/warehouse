import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Vendor } from '@inventory-system/contracts';
import { sessionQueryKey } from '@/features/auth/query-options';
import UniversalSearchPage from './page';
import { browserApi } from '@/lib/api/browser';

const push = vi.fn();
let params = new URLSearchParams('q=hoodie&page=2');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    usePathname: () => '/dashboard/search',
    useSearchParams: () => params,
}));


const vendor: Vendor = {
    id: 'vendor-1',
    email: 'vendor@example.com',
    companyName: 'Acme',
    createdAt: '2026-08-29T10:00:00.000Z',
};

const renderPage = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(sessionQueryKey, vendor);
    return render(
        <QueryClientProvider client={queryClient}>
            <UniversalSearchPage />
        </QueryClientProvider>
    );
};

describe('UniversalSearchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        params = new URLSearchParams('q=hoodie&page=2');
        vi.spyOn(browserApi.search, 'universal').mockResolvedValue({
            success: true,
            data: {
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
            },
        });
    });

    it('restores URL query/page state and renders version deep links', async () => {
        renderPage();

        expect(
            await screen.findByRole('link', { name: /midnight hoodie/i })
        ).toBeInTheDocument();
        expect(browserApi.search.universal).toHaveBeenCalledWith(
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
        renderPage();
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
        renderPage();
        await screen.findByRole('link', { name: /midnight hoodie/i });

        await user.click(screen.getByRole('button', { name: /previous/i }));
        expect(push).toHaveBeenCalledWith('/dashboard/search?q=hoodie&page=1');
    });
});
