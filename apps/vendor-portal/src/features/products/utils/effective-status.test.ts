import { describe, expect, it } from 'vitest';
import { PRODUCT_STATUSES } from '@inventory-system/contracts';
import { calculateEffectiveStatus } from './effective-status';

describe('effective product version status', () => {
    for (const product of PRODUCT_STATUSES) for (const version of PRODUCT_STATUSES) {
        it(`${product} product with ${version} version`, () => {
            let expected = 'DRAFT';
            if (product === 'ACTIVE' && version === 'ACTIVE') expected = 'ACTIVE';
            if (product === 'DISCONTINUED' || version === 'DISCONTINUED') expected = 'DISCONTINUED';
            expect(calculateEffectiveStatus(product, version)).toBe(expected);
        });
    }
});
