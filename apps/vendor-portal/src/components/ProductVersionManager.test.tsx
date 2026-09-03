import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductStatus } from '@inventory-system/shared-types';
import ProductVersionManager, { ManagedProductVersion } from './ProductVersionManager';

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        createProductVersion: vi.fn(),
        updateProductVersion: vi.fn(),
        setPrimaryProductVersion: vi.fn(),
        deleteProductVersion: vi.fn(),
        compareProductVersions: vi.fn(),
        uploadProductVersionImage: vi.fn(),
        deleteProductImage: vi.fn(),
    },
}));

vi.mock('@/lib/api', () => ({ api: apiMock }));

const original: ManagedProductVersion = {
    id: 'version-original',
    versionNumber: 1,
    label: 'Original',
    sku: 'SKU-ORIGINAL',
    status: ProductStatus.ACTIVE,
    effectiveStatus: ProductStatus.ACTIVE,
    characteristics: [{ name: 'Color', value: 'Black' }],
    designNotes: 'First release',
    isPrimary: true,
    canDelete: false,
    images: [],
};

const summer: ManagedProductVersion = {
    ...original,
    id: 'version-summer',
    versionNumber: 2,
    label: 'Summer Drop',
    sku: 'SKU-SUMMER',
    status: ProductStatus.DRAFT,
    effectiveStatus: ProductStatus.DRAFT,
    isPrimary: false,
    canDelete: true,
};

describe('ProductVersionManager', () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
        onChanged.mockResolvedValue(undefined);
        Object.values(apiMock).forEach((mock) =>
            mock.mockResolvedValue({ success: true, data: {} })
        );
    });

    it('creates a copied version while reusing media references', async () => {
        const user = userEvent.setup();
        render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[original, summer]}
                onChanged={onChanged}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Add version' }));
        await user.click(screen.getByRole('button', { name: /Copy existing/ }));
        await user.selectOptions(
            screen.getByRole('combobox', { name: 'Source version' }),
            summer.id
        );
        await user.type(screen.getByPlaceholderText('e.g. Summer 2027'), 'Holiday Drop');
        await user.click(screen.getByRole('button', { name: 'Create version' }));

        await waitFor(() =>
            expect(apiMock.createProductVersion).toHaveBeenCalledWith(
                'product-1',
                expect.objectContaining({
                    label: 'Holiday Drop',
                    mode: 'COPY',
                    sourceVersionId: summer.id,
                    copyImages: true,
                })
            )
        );
        expect(onChanged).toHaveBeenCalled();
    });

    it('sets a non-primary version as primary and protects the current primary from deletion', async () => {
        const user = userEvent.setup();
        render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[original, summer]}
                onChanged={onChanged}
            />
        );

        expect(screen.getAllByRole('button', { name: 'Delete' })[0]).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Set primary' }));
        await waitFor(() =>
            expect(apiMock.setPrimaryProductVersion).toHaveBeenCalledWith('product-1', summer.id)
        );
    });

    it('compares exactly two selected versions', async () => {
        const user = userEvent.setup();
        apiMock.compareProductVersions.mockResolvedValue({
            success: true,
            data: {
                left: original,
                right: summer,
                differences: [{ field: 'sku', left: original.sku, right: summer.sku }],
            },
        });
        render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[original, summer]}
                onChanged={onChanged}
            />
        );

        await user.click(screen.getByRole('checkbox', { name: 'Compare Original' }));
        await user.click(screen.getByRole('checkbox', { name: 'Compare Summer Drop' }));
        await user.click(screen.getByRole('button', { name: 'Compare (2/2)' }));

        expect(await screen.findByText('Version comparison')).toBeInTheDocument();
        expect(screen.getAllByText(original.sku).length).toBeGreaterThan(1);
        expect(screen.getAllByText(summer.sku).length).toBeGreaterThan(1);
    });

    it('changes version lifecycle state while keeping product context visible', async () => {
        const user = userEvent.setup();
        render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[original, summer]}
                onChanged={onChanged}
            />
        );

        await user.click(screen.getAllByRole('button', { name: 'Discontinue' })[1]);
        await waitFor(() =>
            expect(apiMock.updateProductVersion).toHaveBeenCalledWith('product-1', summer.id, {
                status: ProductStatus.DISCONTINUED,
            })
        );
        expect(screen.getByText('Summer Drop')).toBeInTheDocument();
    });

    it('rejects an oversized image before calling the media API', async () => {
        const user = userEvent.setup();
        render(
            <ProductVersionManager
                productId="product-1"
                productStatus={ProductStatus.ACTIVE}
                versions={[original]}
                onChanged={onChanged}
            />
        );

        await user.upload(
            screen.getByLabelText('Add image'),
            new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
                type: 'image/png',
            })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Image must be 2 MB or smaller.'
        );
        expect(apiMock.uploadProductVersionImage).not.toHaveBeenCalled();
    });
});
