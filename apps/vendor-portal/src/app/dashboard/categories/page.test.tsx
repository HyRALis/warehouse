import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CategoriesPage from './page';
import { api, ApiError } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    ApiError: class extends Error { constructor(message: string) { super(message); } },
    api: {
        getCategories: vi.fn(),
        getTemplates: vi.fn(),
        createCategory: vi.fn(),
        updateCategory: vi.fn(),
        deleteCategory: vi.fn(),
    },
}));

const categories = [
    { id: 'system-1', code: 'FOOD', name: 'Food', vendorId: null, aliases: ['groceries'], parent: null, defaultTemplate: { id: 'template-1', name: 'Packaged Food' }, _count: { products: 2, children: 8 } },
    { id: 'custom-1', name: 'Creator Merch', vendorId: 'vendor-1', aliases: ['influencer goods'], parent: { id: 'system-1', name: 'Food' }, defaultTemplate: null, _count: { products: 1, children: 0 } },
];

describe('CategoriesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, '', '/dashboard/categories');
        vi.mocked(api.getCategories).mockResolvedValue({ success: true, data: categories });
        vi.mocked(api.getTemplates).mockResolvedValue({ success: true, data: [{ id: 'template-1', name: 'Packaged Food' }] });
    });

    it('separates editable vendor categories from read-only system records', async () => {
        render(<CategoriesPage />);
        expect(await screen.findByText('Food / Creator Merch')).toBeInTheDocument();
        expect(screen.getByLabelText('Edit Creator Merch')).toBeInTheDocument();
        expect(screen.queryByLabelText('Edit Food')).not.toBeInTheDocument();
        expect(screen.getByText('Default: Packaged Food')).toBeInTheDocument();
        expect(screen.getByText('8 subcategories')).toBeInTheDocument();
    });

    it('filters categories by aliases and opens quick-create routes', async () => {
        window.history.replaceState({}, '', '/dashboard/categories?create=true');
        const user = userEvent.setup();
        render(<CategoriesPage />);
        expect(await screen.findByRole('heading', { name: 'New custom category' })).toBeInTheDocument();
        await user.type(screen.getByRole('textbox', { name: 'Search categories' }), 'groceries');
        expect(screen.getAllByText('Food')).not.toHaveLength(0);
        expect(within(screen.getByRole('region', { name: 'Your custom categories' })).queryByText('Food / Creator Merch')).not.toBeInTheDocument();
    });

    it('surfaces safe-deletion conflicts from the API', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.mocked(api.deleteCategory).mockRejectedValue(new ApiError('Move linked products before deleting', 409, 'CATEGORY_IN_USE'));
        const user = userEvent.setup();
        render(<CategoriesPage />);
        await user.click(await screen.findByLabelText('Delete Creator Merch'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Move linked products before deleting');
    });
});
