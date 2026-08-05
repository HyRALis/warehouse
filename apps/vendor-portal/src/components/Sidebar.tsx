'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    FolderTree,
    Sliders,
    FileSpreadsheet,
    Settings,
    Store,
    LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products Catalog', href: '/dashboard/products', icon: Package },
    { name: 'Categories', href: '/dashboard/categories', icon: FolderTree },
    { name: 'Field Templates', href: '/dashboard/templates', icon: Sliders },
    { name: 'Bulk CSV Ops', href: '/dashboard/bulk', icon: FileSpreadsheet },
    { name: 'Store Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { vendor, logout } = useAuth();

    return (
        <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
            {/* Brand Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
                    <Store className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-wide text-white">OmniStock</h1>
                    <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                        Vendor Portal
                    </span>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
                {navigation.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                            }`}
                        >
                            <Icon
                                className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`}
                            />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Vendor Profile Footer */}
            <div className="border-t border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="truncate pr-2">
                        <p className="truncate text-sm font-semibold text-white">
                            {vendor?.companyName || 'Vendor Company'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{vendor?.email}</p>
                    </div>
                    <button
                        onClick={() => logout()}
                        title="Log Out"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
