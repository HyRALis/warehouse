import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductStatus } from '@inventory-system/contracts';
import { ProductDetailsEditor } from './ProductDetailsEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { updateProduct } = vi.hoisted(() => ({ updateProduct: vi.fn() }));

vi.mock('@/lib/api/browser', () => ({ browserApi: { products: { update: updateProduct } } }));

const product = {
    id: 'product-1',
    baseName: 'Studio Hoodie',
    sku: 'HOODIE-001',
    barcode: null,
    categoryId: '11111111-1111-4111-8111-111111111111',
    status: ProductStatus.DRAFT,
};

const categories = [
    {
        id: 'apparel',
        name: 'Apparel',
        children: [
            {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Hoodies',
                parentId: 'apparel',
            },
            {
                id: '22222222-2222-4222-8222-222222222222',
                name: 'Shirts',
                parentId: 'apparel',
            },
        ],
    },
];

describe('ProductDetailsEditor', () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
        updateProduct.mockResolvedValue({ success: true });
        onSaved.mockResolvedValue(undefined);
    });

    it('updates identifiers, category, and lifecycle status without changing versions separately', async () => {
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={new QueryClient()}><ProductDetailsEditor product={product} categories={categories} onSaved={onSaved} /></QueryClientProvider>
        );

        await user.click(screen.getByRole('button', { name: 'Edit product' }));
        await user.clear(screen.getByLabelText('Product name'));
        await user.type(screen.getByLabelText('Product name'), 'Studio Hoodie 2');
        await user.click(screen.getByRole('combobox', { name: 'Category' }));
        await user.click(screen.getByRole('option', { name: /Shirts/ }));
        await user.selectOptions(screen.getByLabelText('Product status'), ProductStatus.ACTIVE);
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        await waitFor(() =>
            expect(updateProduct).toHaveBeenCalledWith('product-1', {
                baseName: 'Studio Hoodie 2',
                sku: 'HOODIE-001',
                barcode: null,
                categoryId: '22222222-2222-4222-8222-222222222222',
                status: ProductStatus.ACTIVE,
            })
        );
        expect(onSaved).toHaveBeenCalledOnce();
    });

    it('keeps the editor open and exposes a retryable API error', async () => {
        const user = userEvent.setup();
        updateProduct.mockRejectedValueOnce(new Error('That SKU is already in use'));
        render(
            <QueryClientProvider client={new QueryClient()}><ProductDetailsEditor product={product} categories={categories} onSaved={onSaved} /></QueryClientProvider>
        );

        await user.click(screen.getByRole('button', { name: 'Edit product' }));
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('That SKU is already in use');
        expect(screen.getByRole('form', { name: 'Edit product details' })).toBeInTheDocument();
        expect(onSaved).not.toHaveBeenCalled();
    });
});
