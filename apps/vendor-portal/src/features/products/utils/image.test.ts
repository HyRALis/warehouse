import { describe, expect, it } from 'vitest';
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES, validateProductImage } from './image';

describe('product image validation', () => {
    it.each(PRODUCT_IMAGE_TYPES)('accepts %s', (type) => {
        expect(validateProductImage(new File(['image'], 'image', { type }))).toBeNull();
    });
    it('rejects unsupported formats and oversized images', () => {
        expect(validateProductImage(new File(['svg'], 'image.svg', { type: 'image/svg+xml' }))).toBeTruthy();
        expect(validateProductImage(new File([new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1)], 'image.png', { type: 'image/png' }))).toContain('2 MB');
    });
});
