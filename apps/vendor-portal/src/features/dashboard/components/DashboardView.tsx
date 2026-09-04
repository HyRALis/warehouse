'use client';

import Link from 'next/link';
import { CheckCircle2, FileText, FolderCog, LayoutGrid, Package, Plus, Upload } from 'lucide-react';
import { Alert, Skeleton } from '@inventory-system/ui';
import { useCurrentVendor } from '@/features/auth/queries';
import { getErrorMessage } from '@/lib/api/client';
import { useDashboardStats } from '../hooks';
import { StatCard } from './StatCard';

const actions = [
    { href: '/dashboard/products/new', label: 'Add Product', description: 'Create a new item', icon: Plus, color: 'text-indigo-400 bg-indigo-500/10' },
    { href: '/dashboard/bulk', label: 'Import CSV', description: 'Bulk upload products', icon: Upload, color: 'text-emerald-400 bg-emerald-500/10' },
    { href: '/dashboard/categories', label: 'Manage Categories', description: 'Organize your inventory', icon: FolderCog, color: 'text-violet-400 bg-violet-500/10' },
] as const;

export const DashboardView = () => {
    const vendor = useCurrentVendor().data;
    const stats = useDashboardStats();
    return <div className="mx-auto max-w-7xl space-y-8">
        <div><h1 className="text-3xl font-bold text-white">Welcome back, {vendor?.companyName}</h1><p className="mt-2 text-slate-400">Here&apos;s what&apos;s happening with your inventory today.</p></div>
        {stats.error && <Alert variant="danger">{getErrorMessage(stats.error)}</Alert>}
        {stats.isPending ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div>
            : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Package className="h-6 w-6" />} label="Total Products" value={stats.data?.totalProducts ?? 0} className="bg-indigo-500/10 text-indigo-400" />
                <StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Active Products" value={stats.data?.activeProducts ?? 0} className="bg-emerald-500/10 text-emerald-400" />
                <StatCard icon={<LayoutGrid className="h-6 w-6" />} label="Categories" value={stats.data?.totalCategories ?? 0} className="bg-violet-500/10 text-violet-400" />
                <StatCard icon={<FileText className="h-6 w-6" />} label="Templates" value={stats.data?.totalTemplates ?? 0} className="bg-amber-500/10 text-amber-400" />
            </div>}
        <section aria-labelledby="quick-actions"><h2 id="quick-actions" className="mb-4 text-xl font-semibold text-white">Quick Actions</h2><div className="grid gap-4 md:grid-cols-3">{actions.map(({ href, label, description, icon: Icon, color }) => <Link key={href} href={href} className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/50 hover:bg-slate-800/80"><div className={`rounded-lg p-3 ${color}`}><Icon className="h-5 w-5" /></div><div><div className="font-medium text-slate-200 group-hover:text-white">{label}</div><div className="text-sm text-slate-500">{description}</div></div></Link>)}</div></section>
    </div>;
};
