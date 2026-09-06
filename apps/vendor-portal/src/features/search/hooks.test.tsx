import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { sessionQueryKey } from '@/features/auth';
import { useUniversalSearchSuggestions } from './hooks';

afterEach(() => vi.useRealTimers());

it('cancels a pending suggestion debounce when the palette unmounts', () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
    client.setQueryData(sessionQueryKey, { id: 'vendor' });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { rerender, unmount } = renderHook(
        ({ term }) => useUniversalSearchSuggestions(term),
        { initialProps: { term: '' }, wrapper },
    );
    rerender({ term: 'new product' });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    client.clear();
    expect(vi.getTimerCount()).toBe(0);
});
