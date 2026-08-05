'use client';

import Link from 'next/link';
import { ShieldCheck, Plus } from 'lucide-react';
import { Badge, Button } from '@inventory-system/ui';

export default function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md transition-all">
            <Badge variant="success" className="gap-2 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4" />
                Portal Auth Verified
            </Badge>

            <div className="flex items-center gap-4">
                <Link href="/dashboard/products/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Product
                    </Button>
                </Link>
            </div>
        </header>
    );
}
