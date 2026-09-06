import { describe, expect, it } from 'vitest';
import { isOwnerRole } from './roles';

describe('isOwnerRole', () => {
    it.each([
        ['a single owner role', 'owner', true],
        ['owner inside a list', 'member, owner', true],
        ['a plain member', 'member', false],
        ['a role that merely contains the word', 'coowner', false],
        ['an empty role', '', false],
    ])('resolves %s', (_label, role, expected) => {
        expect(isOwnerRole(role)).toBe(expected);
    });
});
