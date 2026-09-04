'use client';

import { Menu } from 'lucide-react';
import { Button } from '@inventory-system/ui';
import { useUiStore } from '@/state/ui-store';
import QuickCreateMenu from './QuickCreateMenu';
import UniversalSearch from './UniversalSearch';

/**
 * The header exposes the universal-search trigger and the quick-create menu.
 * Mobile navigation is owned by `DashboardShell`, which renders the sidebar in a Sheet;
 * this component only opens it.
 */
export default function Header() {
    const setMobileOpen = useUiStore((state) => state.setMobileNavigationOpen);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md sm:px-6 md:justify-between">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="shrink-0 md:hidden"
                aria-label="Open navigation"
            >
                <Menu className="h-5 w-5" />
            </Button>

            <UniversalSearch />

            <QuickCreateMenu variant="header" className="hidden md:block" />
        </header>
    );
}
