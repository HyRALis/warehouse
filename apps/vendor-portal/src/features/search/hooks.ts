'use client';

import { useQuery } from '@tanstack/react-query';
import { useDebounceValue } from 'usehooks-ts';
import { browserApi } from '@/lib/api/browser';
import { useCurrentVendor } from '@/features/auth/queries';
import { MIN_SEARCH_LENGTH, universalSearchQueryOptions } from './query-options';

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Palette suggestions: grouped, capped per type. TanStack Query cancels the in-flight
 * request through the query signal when the debounced term changes.
 */
export const useUniversalSearchSuggestions = (term: string, limitPerType = 5) => {
    const { data: vendor } = useCurrentVendor();
    const [debounced] = useDebounceValue(term.trim(), SEARCH_DEBOUNCE_MS);
    const enabled = Boolean(vendor) && debounced.length >= MIN_SEARCH_LENGTH;

    return useQuery({
        ...universalSearchQueryOptions(browserApi, vendor?.id || 'pending', {
            q: debounced,
            mode: 'suggestions',
            limitPerType,
        }),
        enabled,
    });
};

/** Full results page: single type, paginated. */
export const useUniversalSearchResults = (params: {
    q: string;
    types?: string;
    type?: string;
    page?: number;
    limit?: number;
}) => {
    const { data: vendor } = useCurrentVendor();
    const term = params.q.trim();
    const enabled = Boolean(vendor) && term.length >= MIN_SEARCH_LENGTH;

    return useQuery({
        ...universalSearchQueryOptions(browserApi, vendor?.id || 'pending', {
            ...params,
            q: term,
            mode: 'results',
        }),
        enabled,
    });
};
