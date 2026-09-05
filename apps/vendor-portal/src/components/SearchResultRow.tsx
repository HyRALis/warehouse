'use client';

import Link from 'next/link';
import { Box, FolderTree, Layers3, SlidersHorizontal } from 'lucide-react';
import type { UniversalSearchResult } from '@inventory-system/contracts';

const typeIcons = {
    product: Box,
    version: Layers3,
    category: FolderTree,
    template: SlidersHorizontal,
};

const highlight = (value: string, query: string) => {
    const index = value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (!query || index < 0) return value;
    return (
        <>
            {value.slice(0, index)}
            <mark className="rounded bg-indigo-400/20 px-0.5 text-indigo-200">
                {value.slice(index, index + query.length)}
            </mark>
            {value.slice(index + query.length)}
        </>
    );
};

interface SearchResultRowProps {
    result: UniversalSearchResult;
    query: string;
    active?: boolean;
    id?: string;
    onSelect?: () => void;
    option?: boolean;
}

export default function SearchResultRow({
    result,
    query,
    active = false,
    id,
    onSelect,
    option = false,
}: SearchResultRowProps) {
    const Icon = typeIcons[result.type];
    return (
        <Link
            id={id}
            href={result.href}
            onClick={onSelect}
            role={option ? 'option' : undefined}
            aria-selected={option ? active : undefined}
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                active
                    ? 'border-indigo-500/60 bg-indigo-500/15'
                    : 'border-transparent hover:border-slate-700 hover:bg-slate-800/70'
            }`}
        >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-indigo-300">
                <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">
                    {highlight(result.title, query)}
                </span>
                {result.subtitle && (
                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {highlight(result.subtitle, query)}
                    </span>
                )}
            </span>
            <span className="mt-1 shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {result.type}
            </span>
        </Link>
    );
}
