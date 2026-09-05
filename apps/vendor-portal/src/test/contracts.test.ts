import { describe, expect, it } from 'vitest';
import {
    apiErrorResponseSchema,
    createProductRequestSchema,
    productListQuerySchema,
    productsApiResponseSchema,
    vendorSchema,
} from '@inventory-system/contracts';

describe('runtime contracts', () => {
    it('accepts ISO vendor dates and rejects non-ISO dates', () => {
        const vendor = { id: 'vendor-1', email: 'vendor@example.com', companyName: 'Acme', createdAt: '2026-08-29T10:00:00.000Z' };
        expect(vendorSchema.parse(vendor)).toEqual(vendor);
        expect(() => vendorSchema.parse({ ...vendor, createdAt: 'yesterday' })).toThrow();
    });

    it('coerces and defaults product pagination', () => {
        expect(productListQuerySchema.parse({ page: '2' })).toMatchObject({ page: 2, limit: 12 });
    });

    it('retains issue field paths in API errors', () => {
        const result = apiErrorResponseSchema.parse({ success: false, message: 'Invalid input', code: 'VALIDATION_ERROR', statusCode: 400, issues: [{ path: ['characteristics', 0, 'value'], message: 'Required' }] });
        expect(result.issues?.[0].path).toEqual(['characteristics', 0, 'value']);
    });

    it('rejects malformed paginated product responses', () => {
        expect(productsApiResponseSchema.safeParse({ success: true, data: [], meta: { total: -1 } }).success).toBe(false);
    });

    it('validates product mutation bodies', () => {
        const result = createProductRequestSchema.safeParse({ baseName: '', sku: '', categoryId: 'not-an-id', characteristics: [] });
        expect(result.success).toBe(false);
    });
});
