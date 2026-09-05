import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// Native Node is intentional: transpiling this test would hide broken package entry points.
test('compiled contracts load through native ESM and CommonJS package entry points', async () => {
    const esm = await import('@inventory-system/contracts');
    const cjs = createRequire(import.meta.url)('@inventory-system/contracts');
    for (const contracts of [esm, cjs]) {
        assert.equal(contracts.productStatusSchema.parse('DRAFT'), 'DRAFT');
        assert.equal(contracts.productStatusSchema.safeParse('UNKNOWN').success, false);
        assert.ok(Object.keys(contracts).length > 20);
    }
    assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
});
