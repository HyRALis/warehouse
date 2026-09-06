import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/test-server';
import { renderWithProviders } from '@/test/render-with-providers';
import { CategoriesView } from './CategoriesView';

const id = '11111111-1111-4111-8111-111111111111';
const category = { id, name: 'Creator goods', vendorProfileId: 'vendor', aliases: ['merch'], createdAt: '2026-09-01T00:00:00.000Z' };
describe('category management', () => {
    it('keeps system records read-only and edits a custom category without clearing its aliases', async () => {
        let requestBody: unknown;
        server.use(
            http.get('*/api/v1/categories', () => HttpResponse.json({ success: true, data: [category, { ...category, id: 'system', name: 'Food', vendorProfileId: null }] })),
            http.put(`*/api/v1/categories/${id}`, async ({ request }) => {
                requestBody = await request.json();
                return HttpResponse.json({ success: true, data: category });
            }),
        );
        const user = userEvent.setup();
        renderWithProviders(<CategoriesView />);
        await user.click(await screen.findByRole('button', { name: 'Edit Creator goods' }));
        expect(screen.queryByRole('button', { name: 'Edit Food' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete Food' })).not.toBeInTheDocument();
        await user.clear(screen.getByLabelText('Name'));
        await user.type(screen.getByLabelText('Name'), 'Creator clothing');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(requestBody).toEqual({ name: 'Creator clothing', parentId: null }));
        await user.type(screen.getByLabelText('Search categories'), 'merch');
        await waitFor(() => expect(screen.getByText('Creator goods')).toBeInTheDocument());
    });
    it('opens the quick-create form and offers retry on load failure', async () => {
        server.use(http.get('*/api/v1/categories', () => HttpResponse.json({ success: false, statusCode: 503, code: 'UNAVAILABLE', message: 'Category service unavailable' }, { status: 503 })));
        renderWithProviders(<CategoriesView />, '?create=true');
        expect(await screen.findByRole('button', { name: 'Retry categories' })).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });
});
