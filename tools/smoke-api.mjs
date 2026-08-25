import crypto from 'node:crypto';

const baseUrl = (process.env.API_SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

const expectResponse = async (response, label) => {
    if (response.ok) return response;

    const body = await response.text();
    throw new Error(`${label} failed (${response.status}): ${body}`);
};

const registration = await expectResponse(
    await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: `phase-zero-${crypto.randomUUID()}@example.com`,
            password: 'phase-zero-smoke-password',
            companyName: 'Phase Zero Smoke Vendor',
        }),
    }),
    'vendor registration'
);

const setCookie =
    registration.headers.getSetCookie?.()[0] || registration.headers.get('set-cookie');
const sessionCookie = setCookie?.split(';')[0];
if (!sessionCookie) throw new Error('Registration did not return a session cookie');

const apiRequest = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Cookie', sessionCookie);

    return expectResponse(
        await fetch(`${baseUrl}${path}`, { ...options, headers }),
        `${options.method || 'GET'} ${path}`
    );
};

const profileResponse = await apiRequest('/api/v1/vendors/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: 'Phase Zero Verified Vendor' }),
});
const profile = await profileResponse.json();
if (profile.data.companyName !== 'Phase Zero Verified Vendor') {
    throw new Error('Vendor profile response did not contain the updated company name');
}

const categoryResponse = await apiRequest('/api/v1/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke category' }),
});
const category = (await categoryResponse.json()).data;

const sku = `SMOKE-${crypto.randomUUID()}`;
const productResponse = await apiRequest('/api/v1/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        categoryId: category.id,
        sku,
        baseName: 'Smoke product',
        status: 'DRAFT',
        characteristics: [{ name: 'Color', value: 'Blue' }],
    }),
});
const product = (await productResponse.json()).data;
if (!product.qrCodeUrl?.startsWith('data:image/png;base64,')) {
    throw new Error('Product creation did not return the expected QR code field');
}

const imageForm = new FormData();
imageForm.append(
    'image',
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'smoke.jpg', {
        type: 'image/jpeg',
    })
);
const imageResponse = await apiRequest(`/api/v1/products/${product.id}/images`, {
    method: 'POST',
    body: imageForm,
});
const image = (await imageResponse.json()).data;
if (!image.imageUrl?.includes('/uploads/')) {
    throw new Error('Image upload did not return the expected media field');
}

const importedSku = `IMPORTED-${crypto.randomUUID()}`;
const csvForm = new FormData();
csvForm.append(
    'file',
    new File(
        [
            `sku,baseName,categoryId,status\n${importedSku},Imported smoke product,${category.id},ACTIVE`,
        ],
        'products.csv',
        { type: 'text/csv' }
    )
);
const importResponse = await apiRequest('/api/v1/products/import', {
    method: 'POST',
    body: csvForm,
});
const importResult = (await importResponse.json()).data;
if (importResult.imported !== 1 || importResult.errors.length !== 0) {
    throw new Error(`CSV import failed: ${JSON.stringify(importResult)}`);
}

const listResponse = await apiRequest('/api/v1/products?limit=100');
const listedProducts = (await listResponse.json()).data;
if (!listedProducts.some((listedProduct) => listedProduct.id === product.id)) {
    throw new Error('Product list did not contain the newly created product');
}

const exportResponse = await apiRequest('/api/v1/products/export');
const exportCsv = await exportResponse.text();
if (!exportCsv.includes(sku) || !exportCsv.includes(importedSku)) {
    throw new Error('CSV export did not contain both smoke-test products');
}

await apiRequest('/api/v1/vendors/me', { method: 'DELETE' });

console.log('Phase 0 API smoke test passed');
