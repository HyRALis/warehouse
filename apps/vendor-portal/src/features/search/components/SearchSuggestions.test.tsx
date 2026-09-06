import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { expect, it, vi } from 'vitest';
import type { UniversalSearchResult } from '@inventory-system/contracts';
import { SearchSuggestions } from './SearchSuggestions';

it('labels result groups and marks the active option without accessibility violations', async () => {
    const result: UniversalSearchResult = { id: 'p1', type: 'product', title: 'Creator Hoodie', subtitle: null, href: '/dashboard/products/p1', score: 100, matchedField: 'name', context: {} };
    const { container } = render(<SearchSuggestions groups={[{ type: 'product', label: 'Products', results: [result] }]} results={[result]} query="hoodie" activeIndex={0} onSelect={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Creator Hoodie/i })).toHaveAttribute('aria-selected', 'true');
    expect((await axe(container)).violations).toEqual([]);
});
