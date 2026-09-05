import { describe, expect, it } from 'vitest';
import type { VendorPlatformContext } from '@inventory-system/contracts';
import { portalAccessDenial } from './portal-access';

const timestamp = '2026-08-29T10:00:00.000Z';

const platformContext = (
    overrides: Partial<VendorPlatformContext> = {}
): VendorPlatformContext => ({
    organization: { id: 'org-1', name: 'Acme', slug: 'acme', logo: null },
    membership: { id: 'member-1', role: 'owner', isOwner: true },
    portal: {
        key: 'vendor',
        subscription: {
            status: 'ACTIVE',
            startsAt: timestamp,
            endsAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            active: true,
        },
        access: { granted: true, implicit: true, record: null },
    },
    vendorProfile: {
        id: 'profile-1',
        profileKey: 'primary',
        displayName: 'Acme Foods',
        description: null,
        websiteUrl: null,
        logoUrl: null,
    },
    ...overrides,
});

describe('portalAccessDenial', () => {
    it('admits a subscribed member that owns a primary vendor profile', () => {
        expect(portalAccessDenial(platformContext())).toBeNull();
    });

    it('reports an unreadable entitlement', () => {
        expect(portalAccessDenial(null)).toBe('The Vendor Portal entitlement could not be read.');
    });

    it.each([
        [
            'an inactive subscription',
            platformContext({
                portal: {
                    key: 'vendor',
                    subscription: null,
                    access: { granted: true, implicit: true, record: null },
                },
            }),
            'Your organization does not currently have an active Vendor Portal subscription.',
        ],
        [
            'a membership without portal access',
            platformContext({
                portal: {
                    key: 'vendor',
                    subscription: platformContext().portal.subscription,
                    access: { granted: false, implicit: false, record: null },
                },
            }),
            'Your membership has not been granted Vendor Portal access.',
        ],
        [
            'a missing vendor profile',
            platformContext({ vendorProfile: null }),
            'The primary Vendor Profile is not available.',
        ],
    ])('reports %s with its own remedy', (_label, context, expected) => {
        expect(portalAccessDenial(context)).toBe(expected);
    });
});
