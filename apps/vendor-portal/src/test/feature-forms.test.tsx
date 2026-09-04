import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@inventory-system/ui';
import type { Vendor } from '@inventory-system/contracts';
import { sessionQueryKey } from '@/features/auth/query-options';
import { tenantKeys } from '@/features/query-keys';
import { TemplatesView } from '@/features/templates/components/TemplatesView';
import { ProductCreateView } from '@/features/products/components/ProductCreateView';
import { browserApi } from '@/lib/api/browser';
import { ApiError } from '@/lib/api/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const vendor: Vendor = {
    id: 'vendor-1',
    email: 'vendor@example.com',
    companyName: 'Acme',
    createdAt: '2026-08-29T10:00:00.000Z',
};

const renderFeature = (view: React.ReactNode, options?: { categories?: boolean; templates?: boolean }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(sessionQueryKey, vendor);
    if (options?.categories) {
        queryClient.setQueryData(tenantKeys.categories(vendor.id), [{ id: '9c163a55-5f52-4e38-bddc-844d84ee80d8', name: 'Audio', vendorId: vendor.id, createdAt: vendor.createdAt }]);
    }
    if (options?.templates) queryClient.setQueryData(tenantKeys.templates(vendor.id), []);
    return render(<QueryClientProvider client={queryClient}><ToastProvider>{view}</ToastProvider></QueryClientProvider>);
};

describe('feature forms', () => {
    it('uses TanStack field-array operations for template rows', async () => {
        const user = userEvent.setup();
        renderFeature(<TemplatesView />, { templates: true });
        await user.click(screen.getByRole('button', { name: 'Create Template' }));
        expect(screen.getByLabelText('Field 1')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Add field' }));
        expect(screen.getByLabelText('Field 2')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Remove field 2' }));
        expect(screen.queryByLabelText('Field 2')).not.toBeInTheDocument();
    });

    it('retries only image upload after product creation succeeds', async () => {
        const user = userEvent.setup();
        const categoryId = '9c163a55-5f52-4e38-bddc-844d84ee80d8';
        const create = vi.spyOn(browserApi.products, 'create').mockResolvedValue({
            success: true,
            data: {
                id: 'product-1', vendorId: vendor.id, categoryId, sku: 'SKU-1', baseName: 'Headphones', imageUrl: null,
                status: 'DRAFT', characteristics: [], createdAt: vendor.createdAt, updatedAt: vendor.createdAt, images: [],
            },
        });
        const upload = vi.spyOn(browserApi.products, 'uploadImage').mockRejectedValue(new ApiError('Upload failed', 503, 'UPLOAD_FAILED'));
        renderFeature(<ProductCreateView />, { categories: true, templates: true });

        await user.type(screen.getByLabelText('Product name'), 'Headphones');
        await user.type(screen.getByLabelText('SKU'), 'SKU-1');
        await user.selectOptions(screen.getByLabelText('Category'), categoryId);
        await user.upload(screen.getByLabelText('Upload primary image'), new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' }));
        await user.click(screen.getByRole('button', { name: 'Save Product' }));

        expect(await screen.findByText('Product created')).toBeInTheDocument();
        expect(create).toHaveBeenCalledTimes(1);
        expect(upload).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button', { name: 'Retry upload' }));
        await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
        expect(create).toHaveBeenCalledTimes(1);
    });
});
