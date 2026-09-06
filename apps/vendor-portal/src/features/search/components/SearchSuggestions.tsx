'use client';

import type { UniversalSearchGroup, UniversalSearchResult } from '@inventory-system/contracts';
import SearchResultRow from '@/components/SearchResultRow';

interface SearchSuggestionsProps {
    groups: UniversalSearchGroup[];
    results: UniversalSearchResult[];
    query: string;
    activeIndex: number;
    onSelect: () => void;
}

export const SearchSuggestions = ({ groups, results, query, activeIndex, onSelect }: SearchSuggestionsProps) => (
    <div id="universal-search-options" role="listbox" aria-label="Search suggestions">
        {groups.map((group) => (
            <div key={group.type} role="group" aria-labelledby={`search-group-${group.type}`} className="mb-3 last:mb-0">
                <div aria-hidden="true" id={`search-group-${group.type}`} className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</div>
                <div className="space-y-1">
                    {group.results.map((result) => {
                        const index = results.findIndex((candidate) => candidate.type === result.type && candidate.id === result.id);
                        return <SearchResultRow key={`${result.type}-${result.id}`} id={`search-result-${index}`} result={result} query={query} active={index === activeIndex} onSelect={onSelect} option />;
                    })}
                </div>
            </div>
        ))}
    </div>
);
