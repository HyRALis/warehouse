import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Product } from '@inventory-system/contracts';
import { ProductCard } from '@/features/products/components/ProductCard';

const baseProduct: Product = {
    id: 'product-1',
    vendorProfileId: 'vendor-1',
    categoryId: 'category-1',
    sku: 'AUD-1042',
    baseName: 'Wireless Noise-Cancelling Headphones',
    imageUrl: null,
    barcode: '812345678901',
    qrCodeUrl: null,
    status: 'ACTIVE',
    characteristics: [{ name: 'Color', value: 'Midnight' }],
    category: { id: 'category-1', name: 'Audio' },
    images: [],
    createdAt: '2026-08-29T10:00:00.000Z',
    updatedAt: '2026-08-29T10:00:00.000Z',
};

const productImage = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" y1="0" x2="1" y2="1"%3E%3Cstop stop-color="%234f46e5"/%3E%3Cstop offset="1" stop-color="%237c3aed"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="800" fill="%230f172a"/%3E%3Ccircle cx="400" cy="400" r="250" fill="url(%23g)"/%3E%3Cpath d="M250 420v150M550 420v150M250 420a150 150 0 0 1 300 0" fill="none" stroke="white" stroke-width="42" stroke-linecap="round"/%3E%3C/svg%3E';

const meta = { title: 'Portal/Products/Product Card', component: ProductCard, args: { product: baseProduct }, decorators: [(Story) => <div className="max-w-sm"><Story /></div>] } satisfies Meta<typeof ProductCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutImage: Story = {};
export const WithImage: Story = { args: { product: { ...baseProduct, images: [{ id: 'image-1', imageUrl: productImage, sortOrder: 0 }] } } };
export const Draft: Story = { args: { product: { ...baseProduct, status: 'DRAFT', baseName: 'Studio Monitor Headphones', sku: 'AUD-2091' } } };
