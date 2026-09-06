import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { ProductStatus } from '@inventory-system/contracts';
import { ProductFilters } from '@/features/products/components/ProductFilters';

const ProductFiltersDemo = () => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ProductStatus | null>(null);
    return <div className="max-w-4xl space-y-4"><ProductFilters search={search} status={status} onSearchChange={setSearch} onStatusChange={setStatus} /><p role="status" className="text-sm text-slate-400">Search: {search || 'none'} · Status: {status || 'all'}</p></div>;
};

const meta = { title: 'Portal/Products/Filters', component: ProductFilters, args: { search: '', status: null, onSearchChange: () => undefined, onStatusChange: () => undefined } } satisfies Meta<typeof ProductFilters>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
    render: () => <ProductFiltersDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByLabelText('Search products'), 'headphones');
        await userEvent.selectOptions(canvas.getByLabelText('Filter by status'), 'ACTIVE');
        await expect(canvas.getByText('Search: headphones · Status: ACTIVE')).toBeVisible();
    },
};

export const Filtered: Story = { args: { search: 'headphones', status: 'ACTIVE' } };
