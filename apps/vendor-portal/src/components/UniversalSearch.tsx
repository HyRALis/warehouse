'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Loader2, Search, X } from 'lucide-react';
import type {
    UniversalSearchGroup,
    UniversalSearchResult,
} from '@inventory-system/contracts';
import { useUniversalSearchSuggestions } from '@/features/search/hooks';
import { getErrorMessage } from '@/lib/api/client';
import SearchResultRow from './SearchResultRow';

export default function UniversalSearch() {
    const router = useRouter();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const {
        data: suggestions,
        isFetching: loading,
        error: searchError,
        refetch,
    } = useUniversalSearchSuggestions(open ? query : '');

    const groups: UniversalSearchGroup[] = useMemo(
        () => suggestions?.groups ?? [],
        [suggestions]
    );
    const error = searchError
        ? getErrorMessage(searchError, 'Search is temporarily unavailable.')
        : '';
    const [activeIndex, setActiveIndex] = useState(0);

    const results = useMemo(
        () => groups.flatMap((group) => group.results),
        [groups]
    );

    const close = useCallback(() => {
        setOpen(false);
        setActiveIndex(0);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
    }, []);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => inputRef.current?.focus());
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useEffect(() => {
        setActiveIndex(0);
    }, [suggestions, query]);

    useEffect(() => {
        if (!open || !results[activeIndex]) return;
        document
            .getElementById(`search-result-${activeIndex}`)
            ?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex, open, results]);

    const selectResult = useCallback(
        (result: UniversalSearchResult) => {
            router.push(result.href);
            close();
        },
        [close, router]
    );

    const showAll = useCallback(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;
        router.push(`/dashboard/search?q=${encodeURIComponent(trimmedQuery)}`);
        close();
    }, [close, query, router]);

    const handleDialogKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'ArrowDown' && results.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % results.length);
        } else if (event.key === 'ArrowUp' && results.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => (current - 1 + results.length) % results.length);
        } else if (event.key === 'Enter' && results[activeIndex]) {
            event.preventDefault();
            selectResult(results[activeIndex]);
        } else if (event.key === 'Tab') {
            const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), a[href]'
                )
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 sm:w-72"
                aria-label="Search products, versions, categories, and templates"
            >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Search everything...</span>
                <kbd className="ml-auto hidden rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
                    Ctrl K
                </kbd>
            </button>

            {open &&
                createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:p-6 sm:pt-[12vh]"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) close();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="Universal search"
                        onKeyDown={handleDialogKeyDown}
                        className="flex h-full w-full flex-col overflow-hidden border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 sm:h-auto sm:max-h-[72vh] sm:max-w-2xl sm:rounded-2xl sm:border"
                    >
                        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
                            {loading ? (
                                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-400" />
                            ) : (
                                <Search className="h-5 w-5 shrink-0 text-slate-500" />
                            )}
                            <label htmlFor="universal-search-input" className="sr-only">
                                Search the vendor portal
                            </label>
                            <input
                                ref={inputRef}
                                id="universal-search-input"
                                role="combobox"
                                aria-expanded="true"
                                aria-controls="universal-search-results"
                                aria-activedescendant={
                                    results[activeIndex] ? `search-result-${activeIndex}` : undefined
                                }
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search products, SKUs, barcodes, categories, templates..."
                                className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-base text-white placeholder:text-slate-500 focus:ring-0"
                            />
                            <button
                                type="button"
                                onClick={close}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
                                aria-label="Close search"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div
                            id="universal-search-results"
                            role="listbox"
                            aria-label="Search suggestions"
                            className="flex-1 overflow-y-auto p-3"
                        >
                            {!query.trim() && (
                                <div className="px-4 py-12 text-center">
                                    <Search className="mx-auto h-8 w-8 text-slate-700" />
                                    <p className="mt-3 text-sm text-slate-400">
                                        Search names, identifiers, categories, and template fields.
                                    </p>
                                </div>
                            )}
                            {error && (
                                <div className="flex flex-col items-center px-4 py-10 text-center">
                                    <AlertCircle className="h-7 w-7 text-rose-400" />
                                    <p className="mt-3 text-sm text-slate-300">{error}</p>
                                    <button
                                        type="button"
                                        onClick={() => void refetch()}
                                        className="mt-4 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                            {!loading && !error && query.trim() && groups.length === 0 && (
                                <p className="px-4 py-12 text-center text-sm text-slate-400">
                                    No matches for “{query.trim()}”. Try a name, SKU, barcode, or category.
                                </p>
                            )}
                            {!error &&
                                groups.map((group) => (
                                    <div key={group.type} className="mb-3 last:mb-0">
                                        <h2 className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                            {group.label}
                                        </h2>
                                        <div className="space-y-1">
                                            {group.results.map((result) => {
                                                const resultIndex = results.findIndex(
                                                    (candidate) =>
                                                        candidate.type === result.type &&
                                                        candidate.id === result.id
                                                );
                                                return (
                                                    <SearchResultRow
                                                        key={`${result.type}-${result.id}`}
                                                        id={`search-result-${resultIndex}`}
                                                        result={result}
                                                        query={query.trim()}
                                                        active={resultIndex === activeIndex}
                                                        onSelect={close}
                                                        option
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {query.trim() && !error && (
                            <button
                                type="button"
                                onClick={showAll}
                                className="flex items-center justify-between border-t border-slate-800 px-5 py-3 text-sm font-semibold text-indigo-300 hover:bg-slate-800/70"
                            >
                                <span>See all results for “{query.trim()}”</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}
                    </section>
                </div>,
                    document.body
                )}
        </>
    );
}
