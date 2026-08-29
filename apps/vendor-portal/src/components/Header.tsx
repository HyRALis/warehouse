'use client';

import Link from 'next/link';
import { Menu, Plus, ShieldCheck } from 'lucide-react';
import { Badge, Button, buttonVariants } from '@inventory-system/ui';
import { useUiStore } from '@/state/ui-store';

export default function Header() {
    const setMobileOpen = useUiStore((state) => state.setMobileNavigationOpen);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(true)}
                    className="md:hidden"
                    aria-label="Open navigation"
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <Badge variant="success" className="hidden gap-2 px-3 py-1.5 sm:flex">
                    <ShieldCheck className="h-4 w-4" />
                    Portal Auth Verified
                </Badge>
            </div>

            <Link href="/dashboard/products/new" className={buttonVariants({ className: 'gap-2' })}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add New Product</span>
                <span className="sm:hidden">Add</span>
            </Link>
        </header>
    );
}
