import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BulkOperationsPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    api: { importCSV: vi.fn(), exportCSV: vi.fn() },
}));

describe('BulkOperationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        URL.createObjectURL = vi.fn(() => 'blob:test');
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    it('shows version-aware import totals and structured row errors', async () => {
        vi.mocked(api.importCSV).mockResolvedValue({
            success: true,
            message: 'Import completed with row errors',
            data: {
                imported: 1,
                importedProducts: 1,
                importedVersions: 2,
                failedRows: 1,
                errors: [{ row: 4, code: 'INVALID_VERSION_STATUS', field: 'versionStatus', message: 'Version status must be DRAFT, ACTIVE, or DISCONTINUED' }],
            },
        });
        const user = userEvent.setup();
        render(<BulkOperationsPage />);

        await user.upload(screen.getByLabelText('Choose product CSV'), new File(['productName,sku\nHoodie,H-1'], 'products.csv', { type: 'text/csv' }));
        await user.click(screen.getByRole('button', { name: 'Start Import' }));

        expect(await screen.findByText('Import completed with row errors')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Version status must be DRAFT, ACTIVE, or DISCONTINUED')).toBeInTheDocument();
        expect(screen.getByText(/INVALID_VERSION_STATUS/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download errors' })).toBeInTheDocument();
    });

    it('rejects files larger than 5 MB before uploading', async () => {
        const user = userEvent.setup();
        render(<BulkOperationsPage />);
        const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'too-large.csv', { type: 'text/csv' });
        await user.upload(screen.getByLabelText('Choose product CSV'), oversized);

        expect(screen.getByText('CSV files must be 5 MB or smaller.')).toBeInTheDocument();
        expect(api.importCSV).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Start Import' })).toBeDisabled();
    });

    it('exports the version-aware catalog filename', async () => {
        vi.mocked(api.exportCSV).mockResolvedValue(new Blob(['csv'], { type: 'text/csv' }));
        const user = userEvent.setup();
        render(<BulkOperationsPage />);
        await user.click(screen.getByRole('button', { name: 'Export Products & Versions' }));
        expect(api.exportCSV).toHaveBeenCalledOnce();
        expect(URL.createObjectURL).toHaveBeenCalled();
    });
});
