import { describe, expect, it } from 'vitest';
import { validateCsvFile } from './csv-file';

describe('CSV file validation', () => {
    it('accepts CSV extension case-insensitively at the size limit', () => {
        expect(validateCsvFile({ name: 'Products.CSV', size: 5 * 1024 * 1024 })).toBeNull();
    });
    it('rejects other formats, oversized and empty files', () => {
        expect(validateCsvFile({ name: 'products.xlsx', size: 100 })).toBe('Choose a CSV file.');
        expect(validateCsvFile({ name: 'products.csv', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
        expect(validateCsvFile({ name: 'products.csv', size: 0 })).toMatch(/empty/);
    });
});
