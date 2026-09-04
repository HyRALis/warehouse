import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircle2, FileText, LayoutGrid, Package } from 'lucide-react';
import { StatCard } from '@/features/dashboard/components/StatCard';

const meta = { title: 'Portal/Dashboard/Stat Card', component: StatCard, args: { icon: <Package className="h-6 w-6" />, label: 'Total Products', value: 142, className: 'bg-indigo-500/10 text-indigo-400' } } satisfies Meta<typeof StatCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const DashboardGrid: Story = {
    render: () => <div className="grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4"><StatCard icon={<Package className="h-6 w-6" />} label="Total Products" value={142} className="bg-indigo-500/10 text-indigo-400" /><StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Active Products" value={118} className="bg-emerald-500/10 text-emerald-400" /><StatCard icon={<LayoutGrid className="h-6 w-6" />} label="Categories" value={24} className="bg-violet-500/10 text-violet-400" /><StatCard icon={<FileText className="h-6 w-6" />} label="Templates" value={7} className="bg-amber-500/10 text-amber-400" /></div>,
};
