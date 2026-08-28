import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchableCategorySelect, { CategoryOption } from './SearchableCategorySelect';

const categories: CategoryOption[] = [
    {
        id: 'electronics',
        name: 'Electronics',
        code: 'electronics',
        aliases: ['gadgets'],
        children: [
            {
                id: 'phones',
                name: 'Phones & Tablets',
                code: 'electronics.phones-tablets',
                aliases: ['smartphones'],
                parentId: 'electronics',
            },
            {
                id: 'audio',
                name: 'Audio',
                code: 'electronics.audio',
                aliases: ['headphones'],
                parentId: 'electronics',
            },
        ],
    },
    { id: 'custom', name: 'Limited Editions', vendorId: 'vendor-1', aliases: ['drops'] },
];

describe('SearchableCategorySelect', () => {
    it('searches aliases and selects only leaf categories', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchableCategorySelect categories={categories} value="" onChange={onChange} />);

        const input = screen.getByRole('combobox', { name: 'Category' });
        await user.click(input);
        expect(screen.queryByRole('option', { name: /^Electronics$/ })).not.toBeInTheDocument();
        await user.type(input, 'smartphones');
        await user.click(screen.getByRole('option', { name: /Phones & Tablets/ }));

        expect(onChange).toHaveBeenCalledWith('phones', expect.objectContaining({ path: 'Electronics / Phones & Tablets' }));
    });

    it('supports keyboard selection and Escape dismissal', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchableCategorySelect categories={categories} value="" onChange={onChange} />);

        const input = screen.getByRole('combobox', { name: 'Category' });
        await user.click(input);
        await user.type(input, 'headphones');
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('audio', expect.objectContaining({ name: 'Audio' }));

        await user.click(input);
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
