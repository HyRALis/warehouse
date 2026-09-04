import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Alert, FileDropzone } from '@inventory-system/ui';
import { validateProductImage } from '@/features/products/utils/image';
import { downloadBlob } from '@/features/bulk/utils/download';

describe('shared UI and browser utilities', () => {
    it('renders accessible feedback and file input', async () => {
        const onFileChange = vi.fn();
        const view = render(<><Alert variant="danger">Upload failed</Alert><FileDropzone label="Choose image" description="JPEG or WebP" onFileChange={onFileChange} /></>);
        expect(await axe(view.container)).toHaveNoViolations();
        const file = new File(['image'], 'photo.webp', { type: 'image/webp' });
        await userEvent.upload(screen.getByLabelText('Choose image'), file);
        expect(onFileChange).toHaveBeenCalledWith(file);
    });

    it('matches image validation to the API', () => {
        expect(validateProductImage(new File(['x'], 'image.png', { type: 'image/png' }))).toContain('JPEG');
        expect(validateProductImage(new File(['x'], 'image.jpg', { type: 'image/jpeg' }))).toBeNull();
    });

    it('downloads and revokes object URLs', () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        downloadBlob(new Blob(['sku']), 'products.csv');
        expect(createObjectURL).toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
});
