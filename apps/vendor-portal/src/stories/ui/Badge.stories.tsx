import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@inventory-system/ui';

const meta = { title: 'Shared UI/Atoms/Badge', component: Badge, args: { children: 'Default', variant: 'default' } } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Statuses: Story = {
    render: () => <div className="flex flex-wrap gap-3"><Badge>Default</Badge><Badge variant="success">Active</Badge><Badge variant="warning">Draft</Badge><Badge variant="danger">Discontinued</Badge><Badge variant="outline">System</Badge></div>,
};
