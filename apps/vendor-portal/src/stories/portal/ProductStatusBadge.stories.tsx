import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductStatusBadge } from '@/features/products/components/ProductStatusBadge';

const meta = { title: 'Portal/Products/Status Badge', component: ProductStatusBadge, args: { status: 'ACTIVE' } } satisfies Meta<typeof ProductStatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const AllStatuses: Story = {
    render: () => <div className="flex flex-wrap gap-3"><ProductStatusBadge status="ACTIVE" /><ProductStatusBadge status="DRAFT" /><ProductStatusBadge status="DISCONTINUED" /></div>,
};
