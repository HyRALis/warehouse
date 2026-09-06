import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductStatus } from '@inventory-system/contracts';
import { ProductDetailsEditor } from '@/components/ProductDetailsEditor';
import { renderWithProviders as render } from './render-with-providers';
import { http, HttpResponse } from 'msw';
import { server } from './test-server';
import ProductVersionManager from '@/components/ProductVersionManager';
import QuickCreateMenu from '@/components/QuickCreateMenu';
import Sidebar from '@/components/Sidebar';
import UniversalSearch from '@/components/UniversalSearch';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/products',
    useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

describe('Vendor workflow accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.use(http.get('*/api/v1/platform/context', () => HttpResponse.json({ success: false, statusCode: 403, code: 'FORBIDDEN', message: 'Unavailable' }, { status: 403 })));
        mocks.useAuth.mockReturnValue({
            user: { email: 'owner@example.test' },
            platform: {
                membership: { isOwner: true },
                vendorProfile: { displayName: 'Studio One' },
            },
            logout: vi.fn(),
        });
    });

    it('has no detectable navigation or quick-create violations', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <>
                <Sidebar />
                <QuickCreateMenu variant="floating" />
            </>
        );

        await user.click(screen.getByRole('button', { name: 'Open quick create menu' }));
        const result = await axe(container);

        expect(result.violations).toEqual([]);
    });

    it('has no detectable product editor violations', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <ProductDetailsEditor
                product={{
                    id: 'product-1',
                    baseName: 'Studio Hoodie',
                    sku: 'HOODIE-001',
                    barcode: '8601234567890',
                    categoryId: 'hoodies',
                    status: ProductStatus.DRAFT,
                }}
                categories={[
                    {
                        id: 'apparel',
                        name: 'Apparel',
                        children: [
                            {
                                id: 'hoodies',
                                name: 'Hoodies',
                                parentId: 'apparel',
                            },
                        ],
                    },
                ]}
                onSaved={vi.fn()}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Edit product' }));
        const result = await axe(container);

        expect(result.violations).toEqual([]);
    });

    it('has no detectable universal-search dialog violations', async () => {
        const user = userEvent.setup();
        render(<UniversalSearch />);

        await user.click(
            screen.getByRole('button', {
                name: 'Search products, versions, categories, and templates',
            })
        );
        const result = await axe(document.body);

        expect(result.violations).toEqual([]);
    });

    it('has no detectable version-management violations', async () => {
        const { container } = render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[
                    {
                        id: 'version-1',
                        versionNumber: 1,
                        label: 'Original',
                        sku: 'HOODIE-001',
                        barcode: '8601234567890',
                        status: ProductStatus.ACTIVE,
                        effectiveStatus: ProductStatus.ACTIVE,
                        characteristics: [{ name: 'Color', value: 'Black' }],
                        designNotes: 'Original design',
                        isPrimary: true,
                        canDelete: false,
                        images: [],
                    },
                ]}
                onChanged={vi.fn()}
            />
        );

        const result = await axe(container);

        expect(result.violations).toEqual([]);
    });
});
