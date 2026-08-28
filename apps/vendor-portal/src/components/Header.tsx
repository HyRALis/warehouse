'use client';

import QuickCreateMenu from './QuickCreateMenu';
import UniversalSearch from './UniversalSearch';

export default function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md transition-all">
            <UniversalSearch />

            <QuickCreateMenu variant="header" className="hidden md:block" />
        </header>
    );
}
