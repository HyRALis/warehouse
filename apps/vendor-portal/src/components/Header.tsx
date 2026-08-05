'use client';

import Link from 'next/link';
import { ShieldCheck, Plus } from 'lucide-react';

export default function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md transition-all">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                Portal Auth Verified
            </div>

            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/products/new"
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4" />
                    Add New Product
                </Link>
            </div>
        </header>
    );
}
