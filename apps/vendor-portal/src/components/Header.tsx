'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Store, X } from 'lucide-react';
import { Button } from '@inventory-system/ui';
import { useAuth } from '@/context/AuthContext';
import { navigationGroups } from './Sidebar';
import QuickCreateMenu from './QuickCreateMenu';
import UniversalSearch from './UniversalSearch';
import OrganizationSwitcher from './OrganizationSwitcher';

export default function Header() {
    const pathname = usePathname();
    const { user, platform, logout } = useAuth();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => setMobileOpen(false), [pathname]);
    useEffect(() => {
        if (!mobileOpen) return;
        closeButtonRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileOpen(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileOpen]);

    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md transition-all md:justify-between md:px-6">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden"
                    aria-label="Open navigation"
                    onClick={() => setMobileOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <UniversalSearch />
                <div className="hidden md:block">
                    <OrganizationSwitcher />
                </div>
                <QuickCreateMenu variant="header" className="hidden md:block" />
            </header>

            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mobile navigation"
                >
                    <button
                        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
                        aria-label="Close navigation"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white">
                                    <Store className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">OmniStock</p>
                                    <p className="text-xs text-indigo-400">Vendor Portal</p>
                                </div>
                            </div>
                            <Button
                                ref={closeButtonRef}
                                variant="ghost"
                                size="icon"
                                aria-label="Close navigation"
                                onClick={() => setMobileOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <nav
                            className="flex-1 space-y-6 overflow-y-auto px-4 py-5"
                            aria-label="Mobile vendor portal"
                        >
                            <OrganizationSwitcher />
                            {navigationGroups.map((group) => (
                                <div key={group.label}>
                                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                        {group.label}
                                    </p>
                                    <div className="space-y-1.5">
                                        {group.items
                                            .filter(
                                                (item) =>
                                                    !item.ownerOnly || platform?.membership.isOwner
                                            )
                                            .map((item) => {
                                                const active =
                                                    pathname === item.href ||
                                                    (item.href !== '/dashboard' &&
                                                        pathname.startsWith(item.href));
                                                const Icon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                        <div className="border-t border-slate-800 p-4">
                            <div className="mb-3 min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    {platform?.vendorProfile?.displayName}
                                </p>
                                <p className="truncate text-xs text-slate-500">{user?.email}</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-slate-400 hover:text-rose-400"
                                onClick={async () => {
                                    await logout();
                                    router.replace('/login');
                                }}
                            >
                                <LogOut className="mr-2 h-4 w-4" /> Log out
                            </Button>
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}
