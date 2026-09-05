import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/test-server';
import { renderWithProviders } from '@/test/render-with-providers';
import { TemplatesView } from './TemplatesView';

const system = { id: 'system', name: 'Food basics', vendorProfileId: null, fields: [{ name: 'Ingredients' }], createdAt: '2026-09-01T00:00:00.000Z' };
describe('template management', () => {
    it('keeps system templates read-only and refreshes the list after creating a custom duplicate', async () => {
        const custom = { ...system, id: 'custom', name: 'Food basics (copy)', vendorProfileId: 'vendor' };
        let duplicated = false;
        server.use(
            http.get('*/api/v1/templates', () => HttpResponse.json({ success: true, data: duplicated ? [system, custom] : [system] })),
            http.post('*/api/v1/templates/system/duplicate', () => {
                duplicated = true;
                return HttpResponse.json({ success: true, data: custom });
            }),
        );
        const user = userEvent.setup();
        renderWithProviders(<TemplatesView />);
        expect(await screen.findByText('System · Read only')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete Food basics' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Duplicate Food basics as custom' }));
        expect(await screen.findByRole('button', { name: 'Delete Food basics (copy)' })).toBeInTheDocument();
        await user.type(screen.getByLabelText('Search templates'), 'unmatched');
        await waitFor(() => expect(screen.queryByRole('heading', { name: 'Food basics' })).not.toBeInTheDocument());
    });
    it('opens the create form from quick-create URLs and recovers list errors', async () => {
        let failed = true;
        server.use(http.get('*/api/v1/templates', () => failed
            ? HttpResponse.json({ success: false, statusCode: 503, code: 'UNAVAILABLE', message: 'Templates unavailable' }, { status: 503 })
            : HttpResponse.json({ success: true, data: [system] })));
        const user = userEvent.setup();
        renderWithProviders(<TemplatesView />, '?create=true');
        expect(await screen.findByText('Templates unavailable')).toBeInTheDocument();
        expect(screen.getByLabelText('Template name')).toBeInTheDocument();
        failed = false;
        await user.click(screen.getByRole('button', { name: 'Retry templates' }));
        expect(await screen.findByText('System · Read only')).toBeInTheDocument();
    });
});
