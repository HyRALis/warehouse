import { createRequire } from 'node:module';
import qs from 'qs';

describe('query parser security override', () => {
    it('uses the patched parser inside Express and body-parser, not just the test dependency', () => {
        const expressRequire = createRequire(require.resolve('express'));
        const bodyParserRequire = createRequire(expressRequire.resolve('body-parser'));
        expect(expressRequire('qs')).toBe(qs);
        expect(bodyParserRequire('qs')).toBe(qs);
        expect(expressRequire('qs/package.json').version).toBe('6.16.0');
    });

    it('enforces comma array limits for bracketed query keys', () => {
        expect(() =>
            qs.parse('item[]=a,b,c,d', {
                comma: true,
                arrayLimit: 3,
                throwOnLimitExceeded: true,
            })
        ).toThrow(RangeError);
    });

    it('safely serializes parsed constructor-like keys', () => {
        const value = qs.parse('item[constructor][isBuffer]=text', { plainObjects: true });
        expect(() => qs.stringify(value)).not.toThrow();
    });

    it('preserves ordinary filters, pagination and repeated identifiers', () => {
        expect(qs.parse('q=blue+shirt&page=2&types=product,version&id[]=one&id[]=two')).toEqual({
            q: 'blue shirt',
            page: '2',
            types: 'product,version',
            id: ['one', 'two'],
        });
    });
});
