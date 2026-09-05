import { describe, expect, it } from 'vitest';
import { DEFAULT_RETURN_TO, safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
    it('keeps a same-origin absolute path', () => {
        expect(safeReturnTo('/accept-invitation?invitationId=abc')).toBe(
            '/accept-invitation?invitationId=abc'
        );
    });

    it.each([
        ['a missing value', null],
        ['an empty value', ''],
        ['a protocol-relative host', '//attacker.example/dashboard'],
        ['an absolute URL', 'https://attacker.example/dashboard'],
        ['a relative path', 'dashboard'],
    ])('falls back for %s', (_label, value) => {
        expect(safeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
    });
});
