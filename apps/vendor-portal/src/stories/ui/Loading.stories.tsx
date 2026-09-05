import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton, Spinner } from '@inventory-system/ui';

const meta = { title: 'Shared UI/Atoms/Loading', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ContentSkeleton: Story = {
    render: () => <div className="max-w-sm space-y-4" role="status" aria-label="Loading product"><Skeleton className="aspect-video w-full" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>,
};

export const Spinners: Story = {
    render: () => <div className="flex items-center gap-8"><span role="status" aria-label="Loading"><Spinner size={16} /></span><span role="status" aria-label="Loading"><Spinner size={24} /></span><span role="status" aria-label="Loading"><Spinner size={40} /></span></div>,
};
