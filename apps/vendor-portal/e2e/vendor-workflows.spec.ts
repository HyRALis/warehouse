import { expect, test } from '@playwright/test';
import path from 'node:path';

const storyUrl = (id: string) => `/iframe.html?id=${id}&viewMode=story`;
const captureEvidence = async (
    page: import('@playwright/test').Page,
    projectName: string,
    name: string
) => {
    if (process.env.CAPTURE_VENDOR_A11Y_EVIDENCE !== 'true') return;
    await page.screenshot({
        path: path.resolve(
            process.cwd(),
            '../../docs/screenshots',
            `vendor-11-${name}-${projectName}.png`
        ),
        fullPage: true,
    });
};

test('quick create keeps keyboard focus inside the mobile sheet', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile sheet behavior');
    await page.goto(
        storyUrl('vendor-products-quick-create-menu--mobile-floating-menu')
    );

    const trigger = page.getByRole('button', { name: 'Open quick create menu' });
    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('menuitem', { name: /Add Category/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close quick create menu' })).toBeFocused();
    await captureEvidence(page, testInfo.project.name, 'quick-create');
});

test('product editor remains usable without horizontal overflow', async ({ page }, testInfo) => {
    await page.goto(storyUrl('vendor-products-product-details-editor--draft-product'));
    await page.getByRole('button', { name: 'Edit product' }).click();

    await expect(page.getByRole('form', { name: 'Edit product details' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await captureEvidence(page, testInfo.project.name, 'product-editor');
});

test('version lifecycle controls remain visible without horizontal overflow', async ({ page }, testInfo) => {
    await page.goto(
        storyUrl('vendor-products-product-version-manager--active-with-draft-version')
    );

    await expect(page.getByRole('heading', { name: 'Product versions' })).toBeVisible();
    await expect(page.getByText('Effective: ACTIVE')).toBeVisible();
    await expect(page.getByText('Effective: DRAFT')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await captureEvidence(page, testInfo.project.name, 'version-manager');
});
