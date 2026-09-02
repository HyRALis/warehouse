import crypto from 'node:crypto';

const baseUrl = (process.env.API_SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const portalOrigin = process.env.API_SMOKE_PORTAL_ORIGIN || 'http://localhost:3000';

const expectResponse = async (response, label) => {
    if (response.ok) return response;

    const body = await response.text();
    throw new Error(`${label} failed (${response.status}): ${body}`);
};

const registration = await expectResponse(
    await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Real-IP': '127.0.0.1' },
        body: JSON.stringify({
            email: `phase-zero-${crypto.randomUUID()}@example.com`,
            password: 'phase-zero-smoke-password',
            companyName: 'Phase Zero Smoke Vendor',
        }),
    }),
    'vendor registration'
);

const setCookie =
    registration.headers
        .getSetCookie?.()
        .find((cookie) => cookie.includes('session_token=')) ||
    registration.headers.get('set-cookie');
let sessionCookie = setCookie?.split(';')[0];
if (!sessionCookie) throw new Error('Registration did not return a session cookie');

const apiRequest = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Cookie', sessionCookie);

    return expectResponse(
        await fetch(`${baseUrl}${path}`, { ...options, headers }),
        `${options.method || 'GET'} ${path}`
    );
};

const uninvitedSignup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Real-IP': '127.0.0.1',
        Origin: portalOrigin,
    },
    body: JSON.stringify({
        email: `uninvited-${crypto.randomUUID()}@example.com`,
        password: 'uninvited-smoke-password',
        name: 'Uninvited Smoke User',
    }),
});
const uninvitedSignupBody = await uninvitedSignup.json();
if (uninvitedSignup.status !== 403 || uninvitedSignupBody.code !== 'INVITATION_REQUIRED') {
    throw new Error(`Uninvited Better Auth signup was not rejected (${uninvitedSignup.status})`);
}

const nativeAuthRequest = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Cookie', sessionCookie);
    headers.set('X-Real-IP', '127.0.0.1');
    headers.set('Origin', portalOrigin);

    return expectResponse(
        await fetch(`${baseUrl}/api/auth${path}`, { ...options, headers }),
        `${options.method || 'GET'} /api/auth${path}`
    );
};

const nativeSession = await (await nativeAuthRequest('/get-session')).json();
if (!nativeSession?.user?.id || !nativeSession?.session?.activeOrganizationId) {
    throw new Error('Better Auth session did not contain the active organization context');
}

const organizations = await (await nativeAuthRequest('/organization/list')).json();
if (!Array.isArray(organizations) || organizations.length !== 1) {
    throw new Error('Registration did not create exactly one Better Auth organization');
}

const organization = await (
    await nativeAuthRequest('/organization/get-full-organization')
).json();
const owner = organization?.members?.find((member) => member.role === 'owner');
if (!owner) throw new Error('Registered organization did not contain an Owner member');

const removeLastOwner = await fetch(`${baseUrl}/api/auth/organization/remove-member`, {
    method: 'POST',
    headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/json',
        'X-Real-IP': '127.0.0.1',
        Origin: portalOrigin,
    },
    body: JSON.stringify({ memberIdOrEmail: owner.id }),
});
if (removeLastOwner.ok || ![400, 403].includes(removeLastOwner.status)) {
    throw new Error('Better Auth allowed the last organization Owner to be removed');
}
const organizationAfterRemovalAttempt = await (
    await nativeAuthRequest('/organization/get-full-organization')
).json();
if (!organizationAfterRemovalAttempt?.members?.some((member) => member.id === owner.id)) {
    throw new Error('The last organization Owner was removed despite the protection rule');
}

const invitedEmail = `invited-${crypto.randomUUID()}@example.com`;
const invitation = await (
    await nativeAuthRequest('/organization/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invitedEmail, role: 'member' }),
    })
).json();
if (invitation.email !== invitedEmail || invitation.role !== 'member') {
    throw new Error('Owner could not create a supported Member invitation');
}

const mfaSetupResponse = await nativeAuthRequest('/two-factor/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'phase-zero-smoke-password', method: 'totp' }),
});
const mfaSetup = await mfaSetupResponse.json();
if (!mfaSetup.totpURI?.startsWith('otpauth://') || mfaSetup.backupCodes?.length !== 10) {
    throw new Error('TOTP enrollment did not return an authenticator URI and recovery codes');
}

const mfaDisableResponse = await nativeAuthRequest('/two-factor/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'phase-zero-smoke-password' }),
});
const mfaDisable = await mfaDisableResponse.json();
if (mfaDisable.status !== true) throw new Error('TOTP enrollment could not be disabled');
const replacementSessionCookie =
    mfaDisableResponse.headers
        .getSetCookie?.()
        .find((cookie) => cookie.includes('session_token=')) ||
    mfaDisableResponse.headers.get('set-cookie');
if (!replacementSessionCookie) {
    throw new Error('Disabling TOTP did not rotate the database session');
}
sessionCookie = replacementSessionCookie.split(';')[0];

const sessions = await (await nativeAuthRequest('/list-sessions')).json();
if (!Array.isArray(sessions) || sessions.length !== 1) {
    throw new Error('Better Auth session listing did not return the current session');
}

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
if (
    typeof image.imageUrl !== 'string' ||
    (!image.imageUrl.startsWith('https://') && !image.imageUrl.includes('/uploads/'))
) {
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

const revokedSession = await (
    await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { Cookie: sessionCookie, 'X-Real-IP': '127.0.0.1' },
    })
).json();
if (revokedSession !== null) {
    throw new Error('Vendor deactivation did not revoke the Better Auth session');
}

console.log('Phase 0 API smoke test passed');
