import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewProductPage from './page';

const { apiMock, pushMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    apiMock: {
        getCategories: vi.fn(),
        getTemplates: vi.fn(),
        createProduct: vi.fn(),
        uploadProductImage: vi.fn(),
    },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', () => ({ api: apiMock }));

const categories = [
    {
        id: 'category-apparel',
        name: 'Apparel',
        aliases: ['clothing'],
        vendorProfileId: null,
        defaultTemplate: {
            id: 'template-apparel',
            name: 'Apparel basics',
            fields: [{ name: 'Color' }, { name: 'Size' }],
        },
    },
    {
        id: 'category-electronics',
        name: 'Electronics',
        aliases: ['tech'],
        vendorProfileId: null,
        defaultTemplate: {
            id: 'template-electronics',
            name: 'Electronics basics',
            fields: [{ name: 'Voltage', measurement: 'V' }],
        },
    },
];

describe('NewProductPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        apiMock.getCategories.mockResolvedValue({ success: true, data: categories });
        apiMock.getTemplates.mockResolvedValue({ success: true, data: [] });
        apiMock.createProduct.mockResolvedValue({ success: true, data: { id: 'product-1' } });
        apiMock.uploadProductImage.mockResolvedValue({ success: true });
    });

    it('loads the category default template and asks before replacing characteristics', async () => {
        const user = userEvent.setup();
        const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<NewProductPage />);

        const category = await screen.findByRole('combobox', { name: 'Category' });
        await user.click(category);
        await user.click(screen.getByRole('option', { name: /Apparel/ }));

        expect(screen.getByDisplayValue('Color')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Size')).toBeInTheDocument();

        await user.type(screen.getAllByPlaceholderText('Value (e.g. Red)')[0], 'Blue');
        await user.click(category);
        await user.click(screen.getByRole('option', { name: /Electronics/ }));

        expect(confirmMock).toHaveBeenCalledOnce();
        expect(screen.getByDisplayValue('Color')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Blue')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Voltage')).not.toBeInTheDocument();
        confirmMock.mockRestore();
    });

    it('keeps a created product and reports an optional image upload failure', async () => {
        const user = userEvent.setup();
        apiMock.uploadProductImage.mockRejectedValue(new Error('R2 upload temporarily failed'));
        const { container } = render(<NewProductPage />);

        await user.type(
            screen.getByPlaceholderText('e.g. Wireless Noise-Cancelling Headphones'),
            'Small Vendor Hoodie'
        );
        const category = await screen.findByRole('combobox', { name: 'Category' });
        await user.click(category);
        await user.click(screen.getByRole('option', { name: /Apparel/ }));

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(fileInput, new File(['image'], 'hoodie.png', { type: 'image/png' }));
        await user.click(screen.getByRole('button', { name: 'Save Product' }));

        await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/products'));
        expect(apiMock.createProduct).toHaveBeenCalledWith(
            expect.objectContaining({
                sku: undefined,
                productStatus: 'DRAFT',
                versionStatus: 'DRAFT',
                generateQrCode: true,
            })
        );
        expect(sessionStorage.getItem('productCreationNotice')).toBe(
            'R2 upload temporarily failed'
        );
    });

    it('keeps creation disabled until catalog options load and provides a retry', async () => {
        const user = userEvent.setup();
        apiMock.getCategories.mockRejectedValueOnce(
            new Error('Categories temporarily unavailable')
        );
        render(<NewProductPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Categories temporarily unavailable'
        );
        expect(screen.getByRole('button', { name: 'Save Product' })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Retry loading options' }));
        await waitFor(() =>
            expect(screen.getByRole('combobox', { name: 'Category' })).not.toBeDisabled()
        );
        expect(apiMock.getCategories).toHaveBeenCalledTimes(2);
    });
});
