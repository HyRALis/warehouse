'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import type {
    UniversalSearchEntityType,
    UniversalSearchResponse,
} from '@inventory-system/shared-types';
import { Button, Input } from '@inventory-system/ui';
import { api } from '@/lib/api';
import SearchResultRow from '@/components/SearchResultRow';

const filters: Array<{ value: UniversalSearchEntityType; label: string }> = [
    { value: 'product', label: 'Products' },
    { value: 'version', label: 'Versions' },
    { value: 'category', label: 'Categories' },
    { value: 'template', label: 'Templates' },
];
const validTypes = new Set<UniversalSearchEntityType>(filters.map((filter) => filter.value));

const parsePage = (value: string | null) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};

function SearchResults() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const rawTypes = searchParams.get('types') || '';
    const page = parsePage(searchParams.get('page'));
    const [draftQuery, setDraftQuery] = useState(query);
    const [response, setResponse] = useState<UniversalSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);

    const selectedTypes = useMemo(() => {
        const selected = rawTypes
            .split(',')
            .filter((type): type is UniversalSearchEntityType =>
                validTypes.has(type as UniversalSearchEntityType)
            );
        return new Set(selected);
    }, [rawTypes]);
    const types = useMemo(() => Array.from(selectedTypes).join(','), [selectedTypes]);

    useEffect(() => setDraftQuery(query), [query]);

    useEffect(() => {
        if (!query.trim()) {
            setResponse(null);
            setLoading(false);
            setError('');
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError('');
        api.universalSearch(
            {
                q: query.trim(),
                mode: 'results',
                types,
                page,
                limit: 20,
            },
            controller.signal
        )
            .then(setResponse)
            .catch((searchError) => {
                if ((searchError as Error).name !== 'AbortError') {
                    setError((searchError as Error).message || 'Search is temporarily unavailable.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [page, query, retryKey, types]);

    const updateUrl = (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value) next.set(key, value);
            else next.delete(key);
        });
        router.push(`${pathname}?${next.toString()}`);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        updateUrl({ q: draftQuery.trim() || null, page: null });
    };

    const toggleType = (type: UniversalSearchEntityType) => {
        const next = new Set(selectedTypes);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        updateUrl({ types: Array.from(next).join(',') || null, page: null });
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <p className="text-sm font-semibold text-indigo-400">Universal search</p>
                <h1 className="mt-1 text-2xl font-bold text-white">Find anything in your catalog</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Search products, sellable versions, categories, and characteristic templates.
                </p>
            </div>

            <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        value={draftQuery}
                        onChange={(event) => setDraftQuery(event.target.value)}
                        placeholder="Search by name, SKU, barcode, category, template field..."
                        className="pl-9"
                        aria-label="Search query"
                    />
                </div>
                <Button type="submit">Search</Button>
            </form>

            <div className="flex flex-wrap gap-2" aria-label="Filter search results">
                {filters.map((filter) => {
                    const selected = selectedTypes.has(filter.value);
                    return (
                        <button
                            key={filter.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleType(filter.value)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                selected
                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                        >
                            {filter.label}
                        </button>
                    );
                })}
                {types && (
                    <button
                        type="button"
                        onClick={() => updateUrl({ types: null, page: null })}
                        className="px-2 text-sm font-semibold text-slate-500 hover:text-white"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {!query.trim() && (
                <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center text-sm text-slate-400">
                    Enter a search term to explore your catalog.
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-sm text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    Searching your catalog...
                </div>
            )}

            {error && !loading && (
                <div className="flex flex-col items-center rounded-2xl border border-rose-500/30 bg-rose-500/5 px-6 py-12 text-center">
                    <AlertCircle className="h-7 w-7 text-rose-400" />
                    <p className="mt-3 text-sm text-slate-300">{error}</p>
                    <Button className="mt-4" variant="secondary" onClick={() => setRetryKey((value) => value + 1)}>
                        Try again
                    </Button>
                </div>
            )}

            {!loading && !error && response && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                        <span>
                            {response.total} result{response.total === 1 ? '' : 's'} for “{response.query}”
                        </span>
                        <span>{response.tookMs} ms</span>
                    </div>
                    {response.data.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center text-sm text-slate-400">
                            No matching records. Try fewer filters or a broader term.
                        </div>
                    ) : (
                        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                            {response.data.map((result) => (
                                <SearchResultRow
                                    key={`${result.type}-${result.id}`}
                                    result={result}
                                    query={query}
                                />
                            ))}
                        </div>
                    )}

                    {response.totalPages > 1 && (
                        <nav className="flex items-center justify-center gap-3" aria-label="Search result pages">
                            <Button
                                variant="secondary"
                                disabled={page <= 1}
                                onClick={() => updateUrl({ page: String(page - 1) })}
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                            </Button>
                            <span className="text-sm text-slate-400">
                                Page {page} of {response.totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                disabled={page >= response.totalPages}
                                onClick={() => updateUrl({ page: String(page + 1) })}
                            >
                                Next <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </nav>
                    )}
                </div>
            )}
        </div>
    );
}

export default function UniversalSearchPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-64 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                </div>
            }
        >
            <SearchResults />
        </Suspense>
    );
}
