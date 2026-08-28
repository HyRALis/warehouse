'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@inventory-system/ui';

export interface CategoryOption {
    id: string;
    name: string;
    code?: string | null;
    aliases?: string[];
    parentId?: string | null;
    vendorId?: string | null;
    defaultTemplateId?: string | null;
    children?: CategoryOption[];
}

interface SearchableCategorySelectProps {
    categories: CategoryOption[];
    value: string;
    onChange: (categoryId: string, category: CategoryOption) => void;
    disabled?: boolean;
    placeholder?: string;
}

interface SelectableCategory extends CategoryOption {
    path: string;
    rootName: string;
    searchableText: string;
}

export default function SearchableCategorySelect({ categories, value, onChange, disabled = false, placeholder = 'Search categories...' }: SearchableCategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    const allCategories = useMemo(() => {
        const map = new Map<string, CategoryOption>();
        const visit = (category: CategoryOption, parentId?: string | null) => {
            const existing = map.get(category.id);
            map.set(category.id, { ...existing, ...category, parentId: category.parentId ?? parentId ?? null });
            category.children?.forEach((item) => visit(item, category.id));
        };
        categories.forEach((category) => visit(category));
        return Array.from(map.values());
    }, [categories]);

    const selectable = useMemo<SelectableCategory[]>(() => {
        const byId = new Map(allCategories.map((category) => [category.id, category]));
        const parentIds = new Set(allCategories.map((category) => category.parentId).filter(Boolean));
        return allCategories
            .filter((category) => !parentIds.has(category.id))
            .map((category) => {
                const parent = category.parentId ? byId.get(category.parentId) : undefined;
                const rootName = parent?.name || (category.vendorId ? 'Your categories' : 'Other');
                const path = parent ? `${parent.name} / ${category.name}` : category.name;
                return {
                    ...category,
                    rootName,
                    path,
                    searchableText: [category.name, path, category.code, ...(category.aliases || [])].filter(Boolean).join(' ').toLowerCase(),
                };
            })
            .sort((a, b) => a.rootName.localeCompare(b.rootName) || a.name.localeCompare(b.name));
    }, [allCategories]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return normalized ? selectable.filter((category) => category.searchableText.includes(normalized)) : selectable;
    }, [query, selectable]);

    const selected = selectable.find((category) => category.id === value);

    useEffect(() => {
        if (!open) return;
        const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('touchstart', closeOnOutsideClick);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('touchstart', closeOnOutsideClick);
        };
    }, [open]);

    useEffect(() => setActiveIndex((index) => Math.min(index, Math.max(filtered.length - 1, 0))), [filtered.length]);

    const selectCategory = (category: SelectableCategory) => {
        onChange(category.id, category);
        setQuery('');
        setOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((index) => (index + direction + filtered.length) % Math.max(filtered.length, 1));
        }
        if (event.key === 'Enter' && open && filtered[activeIndex]) {
            event.preventDefault();
            selectCategory(filtered[activeIndex]);
        }
    };

    const groups = useMemo(() => {
        const result = new Map<string, SelectableCategory[]>();
        filtered.forEach((category) => result.set(category.rootName, [...(result.get(category.rootName) || []), category]));
        return Array.from(result.entries());
    }, [filtered]);

    return (
        <div ref={rootRef} className="relative">
            <div className={cn('flex items-center rounded-lg border bg-slate-950 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20', open ? 'border-indigo-500' : 'border-slate-800', disabled && 'opacity-60')}>
                <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label="Category"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined}
                    disabled={disabled}
                    value={open ? query : selected?.path || ''}
                    placeholder={placeholder}
                    onFocus={() => { setOpen(true); setQuery(''); }}
                    onClick={() => setOpen(true)}
                    onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
                    onKeyDown={handleKeyDown}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
                <button type="button" aria-label="Toggle category options" disabled={disabled} onClick={() => { setOpen((current) => !current); inputRef.current?.focus(); }} className="mr-2 rounded p-1 text-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                </button>
            </div>

            {open && (
                <div id={listboxId} role="listbox" aria-label="Category options" className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
                    {groups.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">No categories match “{query}”.</p>
                    ) : (
                        groups.map(([group, items]) => (
                            <div key={group} role="group" aria-label={group} className="mb-2 last:mb-0">
                                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
                                {items.map((category) => {
                                    const index = filtered.findIndex((item) => item.id === category.id);
                                    return (
                                        <button
                                            key={category.id}
                                            id={`${listboxId}-${category.id}`}
                                            type="button"
                                            role="option"
                                            aria-selected={category.id === value}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => selectCategory(category)}
                                            className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm outline-none', index === activeIndex ? 'bg-indigo-500/15 text-white' : 'text-slate-300 hover:bg-slate-800', category.id === value && 'font-medium text-indigo-300')}
                                        >
                                            <span>
                                                <span className="block">{category.name}</span>
                                                {category.code && <span className="mt-0.5 block font-mono text-[11px] text-slate-600">{category.code}</span>}
                                            </span>
                                            {category.id === value && <Check className="h-4 w-4 text-indigo-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
