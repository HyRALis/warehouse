'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Package, CheckCircle2, LayoutGrid, FileText, Plus, Upload, FolderCog } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalTemplates: number;
}

export default function DashboardOverview() {
    const { vendor } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalProducts: 0,
        activeProducts: 0,
        totalCategories: 0,
        totalTemplates: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [productsRes, categoriesRes, templatesRes] = await Promise.all([
                    api.getProducts(),
                    api.getCategories(),
                    api.getTemplates(),
                ]);

                const products = productsRes.data || [];
                const active = products.filter((p: any) => p.status === 'Active').length;

                setStats({
                    totalProducts: productsRes.meta?.total || products.length,
                    activeProducts: active,
                    totalCategories: (categoriesRes.data || []).length,
                    totalTemplates: (templatesRes.data || []).length,
                });
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Welcome back, {vendor?.companyName}
                </h1>
                <p className="mt-2 text-slate-400">
                    Here's what's happening with your inventory today.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<Package className="h-6 w-6 text-indigo-400" />}
                    label="Total Products"
                    value={loading ? '-' : stats.totalProducts}
                    bgClass="bg-indigo-500/10"
                    borderClass="border-indigo-500/20"
                />
                <StatCard
                    icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
                    label="Active Products"
                    value={loading ? '-' : stats.activeProducts}
                    bgClass="bg-emerald-500/10"
                    borderClass="border-emerald-500/20"
                />
                <StatCard
                    icon={<LayoutGrid className="h-6 w-6 text-violet-400" />}
                    label="Categories"
                    value={loading ? '-' : stats.totalCategories}
                    bgClass="bg-violet-500/10"
                    borderClass="border-violet-500/20"
                />
                <StatCard
                    icon={<FileText className="h-6 w-6 text-amber-400" />}
                    label="Templates"
                    value={loading ? '-' : stats.totalTemplates}
                    bgClass="bg-amber-500/10"
                    borderClass="border-amber-500/20"
                />
            </div>

            <div>
                <h2 className="mb-4 text-xl font-semibold text-white">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Link
                        href="/dashboard/products/new"
                        className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-indigo-500/50 hover:bg-slate-800/80"
                    >
                        <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400 transition-transform group-hover:scale-110">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 transition-colors group-hover:text-white">
                                Add Product
                            </div>
                            <div className="text-sm text-slate-500">Create a new item</div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/bulk"
                        className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-800/80"
                    >
                        <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 transition-transform group-hover:scale-110">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 transition-colors group-hover:text-white">
                                Import CSV
                            </div>
                            <div className="text-sm text-slate-500">Bulk upload products</div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/categories"
                        className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-800/80"
                    >
                        <div className="rounded-lg bg-violet-500/10 p-3 text-violet-400 transition-transform group-hover:scale-110">
                            <FolderCog className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 transition-colors group-hover:text-white">
                                Manage Categories
                            </div>
                            <div className="text-sm text-slate-500">Organize your inventory</div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    bgClass,
    borderClass,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    bgClass: string;
    borderClass: string;
}) {
    return (
        <div
            className={`relative flex items-start gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6`}
        >
            <div className={`rounded-xl p-3 ${bgClass} ${borderClass} border`}>{icon}</div>
            <div>
                <div className="mb-1 text-sm font-medium text-slate-400">{label}</div>
                <div className="text-3xl font-bold text-white">{value}</div>
            </div>
        </div>
    );
}
