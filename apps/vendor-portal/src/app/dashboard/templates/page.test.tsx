import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TemplatesPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    ApiError: class extends Error {},
    api: {
        getTemplates: vi.fn(),
        createTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        duplicateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
    },
}));

const templates = [
    { id: 'system-1', key: 'apparel', name: 'Apparel', vendorProfileId: null, fields: [{ name: 'Size' }, { name: 'Material' }], _count: { defaultForCategories: 8 } },
    { id: 'custom-1', name: 'Creator Drop', vendorProfileId: 'profile-1', fields: [{ name: 'Collection' }], _count: { defaultForCategories: 1 } },
];

describe('TemplatesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, '', '/dashboard/templates');
        vi.mocked(api.getTemplates).mockResolvedValue({ success: true, data: templates });
        vi.mocked(api.duplicateTemplate).mockResolvedValue({ success: true, data: {} });
    });

    it('keeps system templates read-only while allowing vendor edits', async () => {
        render(<TemplatesPage />);
        expect(await screen.findByText('Apparel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /duplicate as custom/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.queryByLabelText('Delete Apparel')).not.toBeInTheDocument();
        expect(screen.getByText('Default for 8 categories')).toBeInTheDocument();
    });

    it('duplicates a system template into the vendor catalog', async () => {
        const user = userEvent.setup();
        render(<TemplatesPage />);
        await user.click(await screen.findByRole('button', { name: /duplicate as custom/i }));
        expect(api.duplicateTemplate).toHaveBeenCalledWith('system-1');
        expect(api.getTemplates).toHaveBeenCalledTimes(2);
        expect(await screen.findByRole('status')).toHaveTextContent(
            '“Apparel” was duplicated as a custom template.'
        );
    });

    it('searches template field names and honors quick-create routing', async () => {
        window.history.replaceState({}, '', '/dashboard/templates?create=true');
        const user = userEvent.setup();
        render(<TemplatesPage />);
        expect(await screen.findByRole('heading', { name: 'New custom template' })).toBeInTheDocument();
        await user.type(screen.getByRole('textbox', { name: 'Search templates' }), 'material');
        expect(screen.getByText('Apparel')).toBeInTheDocument();
        expect(screen.queryByText('Creator Drop')).not.toBeInTheDocument();
    });

    it('retries an initial template loading failure', async () => {
        vi.mocked(api.getTemplates)
            .mockRejectedValueOnce(new Error('Templates are temporarily unavailable'))
            .mockResolvedValueOnce({ success: true, data: templates });
        const user = userEvent.setup();

        render(<TemplatesPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Templates are temporarily unavailable'
        );
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('Creator Drop')).toBeInTheDocument();
        expect(api.getTemplates).toHaveBeenCalledTimes(2);
    });
});
