import { describe, expect, it } from 'vitest';
import { parseSearchUrl } from './search-url';

describe('search URL validation', () => {
    it.each([null, 'NaN', '0', '-2', '1.5', 'Infinity'])('defaults invalid page %s', (page) => {
        expect(parseSearchUrl(page, 'product,unknown,product')).toEqual({ page: 1, types: 'product' });
    });
    it('preserves valid pages and supported filters', () => {
        expect(parseSearchUrl('3', 'version,template')).toEqual({ page: 3, types: 'version,template' });
    });
});
