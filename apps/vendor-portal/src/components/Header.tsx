'use client';

import { ShieldCheck } from 'lucide-react';
import { Badge } from '@inventory-system/ui';
import QuickCreateMenu from './QuickCreateMenu';

export default function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md transition-all">
            <Badge variant="success" className="gap-2 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4" />
                Portal Auth Verified
            </Badge>

            <QuickCreateMenu variant="header" className="hidden md:block" />
        </header>
    );
}
