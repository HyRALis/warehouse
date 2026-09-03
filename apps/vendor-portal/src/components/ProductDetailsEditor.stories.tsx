import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProductStatus } from '@inventory-system/shared-types';
import ProductDetailsEditor from './ProductDetailsEditor';

const meta = {
    title: 'Vendor products/Product details editor',
    component: ProductDetailsEditor,
    args: {
        product: {
            id: 'product-studio-hoodie',
            baseName: 'Studio Hoodie',
            sku: 'HOODIE-001',
            barcode: '8601234567890',
            categoryId: 'apparel-hoodies',
            status: ProductStatus.DRAFT,
        },
        categories: [
            {
                id: 'apparel',
                name: 'Apparel',
                code: 'apparel',
                children: [
                    {
                        id: 'apparel-hoodies',
                        name: 'Hoodies',
                        code: 'apparel.hoodies',
                        parentId: 'apparel',
                    },
                    {
                        id: 'apparel-shirts',
                        name: 'Shirts',
                        code: 'apparel.shirts',
                        parentId: 'apparel',
                    },
                ],
            },
        ],
        onSaved: async () => undefined,
    },
    parameters: {
        docs: {
            description: {
                component:
                    'Edits product identity and lifecycle fields while the backend keeps the primary version identifiers synchronized.',
            },
        },
    },
} satisfies Meta<typeof ProductDetailsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DraftProduct: Story = {};

export const CategoryServiceUnavailable: Story = {
    args: {
        categories: [],
        categoriesError: 'Categories are temporarily unavailable.',
        onRetryCategories: () => undefined,
    },
};
