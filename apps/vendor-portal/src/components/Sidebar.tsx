'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FileSpreadsheet,
    FolderTree,
    LayoutDashboard,
    LogOut,
    Package,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    Sliders,
    Store,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, cn } from '@inventory-system/ui';
import { useCurrentVendor, useLogout, usePlatformContext } from '@/features/auth/queries';
import { useUiStore } from '@/state/ui-store';

interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    /** Hidden from non-owners; the API still enforces the rule. */
    ownerOnly?: boolean;
}

export const navigationGroups: { label: string; items: NavigationItem[] }[] = [
    {
        label: 'Inventory',
        items: [
            { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Products Catalog', href: '/dashboard/products', icon: Package },
        ],
    },
    {
        label: 'Advanced setup',
        items: [
            { name: 'Categories', href: '/dashboard/categories', icon: FolderTree },
            { name: 'Field Templates', href: '/dashboard/templates', icon: Sliders },
            { name: 'Bulk CSV Ops', href: '/dashboard/bulk', icon: FileSpreadsheet },
        ],
    },
    {
        label: 'Workspace',
        items: [
            { name: 'Store Settings', href: '/dashboard/settings', icon: Settings },
            {
                name: 'Team Access',
                href: '/dashboard/members',
                icon: UsersRound,
                ownerOnly: true,
            },
        ],
    },
];

export default function Sidebar({
    collapsed = false,
    mobile = false,
}: {
    collapsed?: boolean;
    mobile?: boolean;
}) {
    const pathname = usePathname();
    const { data: vendor } = useCurrentVendor();
    const { data: platform } = usePlatformContext();
    const isOwner = platform?.membership.isOwner === true;
    const logout = useLogout();
    const toggleSidebar = useUiStore((state) => state.toggleSidebar);
    const setMobileOpen = useUiStore((state) => state.setMobileNavigationOpen);
    const compact = collapsed && !mobile;

    return (
        <aside
            className={cn(
                'sticky top-0 flex h-screen flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-[width]',
                compact ? 'w-20' : 'w-64',
                mobile && 'w-full border-r-0'
            )}
        >
            <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
                    <Store className="h-5 w-5" />
                </div>
                {!compact && (
                    <div>
                        <h1 className="text-lg font-bold tracking-wide text-white">OmniStock</h1>
                        <span className="text-xs font-semibold text-indigo-400">Vendor Portal</span>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Vendor portal">
                {navigationGroups.map((group) => (
                    <div key={group.label}>
                        {!compact && (
                            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-1.5">
                            {group.items
                                .filter((item) => !item.ownerOnly || isOwner)
                                .map((item) => {
                                const active =
                                    pathname === item.href ||
                                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => mobile && setMobileOpen(false)}
                                        title={compact ? item.name : undefined}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                            compact ? 'justify-center' : 'gap-3',
                                            active
                                                ? 'bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/30'
                                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        {!compact && <span>{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-slate-800 p-3">
                {!compact && (
                    <div className="mb-3 truncate px-2">
                        <p className="truncate text-sm font-semibold text-white">
                            {platform?.vendorProfile?.displayName ||
                                vendor?.companyName ||
                                'Vendor Company'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{vendor?.email}</p>
                    </div>
                )}
                <div className={cn('flex items-center', compact ? 'flex-col gap-2' : 'justify-between')}>
                    {!mobile && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {compact ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => logout.mutate()}
                        disabled={logout.isPending}
                        aria-label="Log out"
                        className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </aside>
    );
}
