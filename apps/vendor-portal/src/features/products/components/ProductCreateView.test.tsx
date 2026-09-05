import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@inventory-system/ui';
import { sessionQueryKey } from '@/features/auth/query-options';
import { tenantKeys } from '@/features/query-keys';
import { server } from '@/test/test-server';
import { ProductCreateView } from './ProductCreateView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const categoryId = '11111111-1111-4111-8111-111111111111';
const date = '2026-09-01T10:00:00.000Z';
const renderForm = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(sessionQueryKey, { id: 'vendor', email: 'test@example.com', companyName: 'Studio', createdAt: date });
    client.setQueryData(tenantKeys.categories('vendor'), [{ id: categoryId, name: 'Clothing', defaultTemplateId: 'template' }]);
    client.setQueryData(tenantKeys.templates('vendor'), [{ id: 'template', name: 'Clothing basics', fields: [{ name: 'Size', measurement: '' }] }]);
    return render(<QueryClientProvider client={client}><ToastProvider><ProductCreateView /></ToastProvider></QueryClientProvider>);
};
const selectCategory = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'Clothing', exact: true }));
};

describe('product-first creation', () => {
    it('submits independent statuses and optional default-template fields without requiring a SKU', async () => {
        let submitted: unknown;
        server.use(http.post('*/api/v1/products', async ({ request }) => {
            submitted = await request.json();
            return HttpResponse.json({ success: true, data: { id: 'product', vendorProfileId: 'vendor', categoryId,
                baseName: 'Hoodie', sku: 'GENERATED', status: 'DISCONTINUED', imageUrl: null,
                characteristics: [], images: [], createdAt: date, updatedAt: date } });
        }));
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByLabelText('Product name'), 'Hoodie');
        await selectCategory(user);
        expect(screen.getByLabelText('Name 1')).toHaveValue('Size');
        await user.selectOptions(screen.getByLabelText('Product status'), 'DISCONTINUED');
        await user.selectOptions(screen.getByLabelText('Initial version status'), 'ACTIVE');
        await user.click(screen.getByLabelText('Generate QR code'));
        await user.click(screen.getByRole('button', { name: 'Save Product' }));
        await waitFor(() => expect(submitted).toMatchObject({ baseName: 'Hoodie', productStatus: 'DISCONTINUED',
            versionStatus: 'ACTIVE', generateQrCode: true, characteristics: [{ name: 'Size', value: '' }] }));
        expect(submitted).not.toHaveProperty('sku');
    });

    it('keeps entered characteristics when the vendor declines the category template', async () => {
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole('button', { name: 'Add characteristic' }));
        await user.type(screen.getByLabelText('Name 1'), 'Material');
        await user.type(screen.getByLabelText('Value'), 'Cotton');
        await selectCategory(user);
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByLabelText('Name 1')).toHaveValue('Material');
        expect(screen.getByLabelText('Value')).toHaveValue('Cotton');
    });
});
