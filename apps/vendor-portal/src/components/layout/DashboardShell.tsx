'use client';

import * as React from 'react';
import { Sheet } from '@inventory-system/ui';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import QuickCreateMenu from '@/components/QuickCreateMenu';
import { useUiStore } from '@/state/ui-store';

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
    const mobileOpen = useUiStore((state) => state.mobileNavigationOpen);
    const setMobileOpen = useUiStore((state) => state.setMobileNavigationOpen);
    const collapsed = useUiStore((state) => state.sidebarCollapsed);

    return (
        <div className="flex min-h-screen bg-slate-950">
            <div className="hidden md:block">
                <Sidebar collapsed={collapsed} />
            </div>
            <Sheet open={mobileOpen} onOpenChange={(open) => {
                setMobileOpen(open);
                if (!open) requestAnimationFrame(() => document.getElementById('vendor-navigation-trigger')?.focus());
            }} title="Vendor portal navigation">
                <Sidebar mobile />
            </Sheet>
            <div className="flex min-w-0 flex-1 flex-col">
                <Header />
                <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6">{children}</main>
                <QuickCreateMenu variant="floating" />
            </div>
        </div>
    );
};
