import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductStatus } from '@inventory-system/contracts';
import ProductVersionManager from './ProductVersionManager';

const meta = {
    title: 'Vendor products/Product version manager',
    component: ProductVersionManager,
    args: {
        productId: 'product-studio-hoodie',
        productStatus: ProductStatus.ACTIVE,
        versions: [
            {
                id: 'version-original',
                versionNumber: 1,
                label: 'Original',
                sku: 'HOODIE-001',
                barcode: '8601234567890',
                status: ProductStatus.ACTIVE,
                effectiveStatus: ProductStatus.ACTIVE,
                characteristics: [
                    { name: 'Color', value: 'Black' },
                    { name: 'Size', value: 'Medium' },
                ],
                designNotes: 'Original embroidered chest mark.',
                isPrimary: true,
                canDelete: false,
                images: [],
            },
            {
                id: 'version-summer',
                versionNumber: 2,
                label: 'Summer Drop',
                sku: 'HOODIE-SUMMER',
                status: ProductStatus.DRAFT,
                effectiveStatus: ProductStatus.DRAFT,
                characteristics: [{ name: 'Color', value: 'Sand' }],
                designNotes: 'Seasonal colorway awaiting photography.',
                isPrimary: false,
                canDelete: true,
                images: [],
            },
        ],
        onChanged: async () => undefined,
    },
} satisfies Meta<typeof ProductVersionManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveWithDraftVersion: Story = {};

export const DiscontinuedProduct: Story = {
    args: { productStatus: ProductStatus.DISCONTINUED },
};
