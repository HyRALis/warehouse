import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/test-server';
import { renderWithProviders } from '@/test/render-with-providers';
import { BulkOperationsView } from './BulkOperationsView';

describe('CSV recovery', () => {
    it('retains a failed upload for retry and clears it after a completed import', async () => {
        let attempts = 0;
        server.use(http.post('*/api/v1/products/import', () => {
            attempts += 1;
            return attempts === 1
                ? HttpResponse.json({ success: false, statusCode: 503, code: 'UNAVAILABLE', message: 'Import unavailable' }, { status: 503 })
                : HttpResponse.json({ success: true, data: { imported: 1, importedProducts: 1, importedVersions: 1, failedRows: 1,
                    errors: [{ row: 3, code: 'REQUIRED_FIELD', message: 'Missing name' }] } });
        }));
        const user = userEvent.setup();
        renderWithProviders(<BulkOperationsView />);
        const input = screen.getByLabelText('Choose CSV file');
        await user.upload(input, new File(['productName\nHoodie'], 'products.csv', { type: 'text/csv' }));
        await user.click(screen.getByRole('button', { name: 'Start Import' }));
        expect(await screen.findByText('Import unavailable')).toBeInTheDocument();
        expect(screen.getByText('products.csv')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Start Import' }));
        expect(await screen.findByText(/upload only those rows/)).toBeInTheDocument();
        expect(input).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Start Import' })).toBeDisabled();
        expect(attempts).toBe(2);
    });
});
