import prisma from '../src/index.js';

interface CountRow {
    count: bigint;
}

async function main(): Promise<void> {
    const [profiles, primaryProfiles, subscriptions, missingOwnerAccess, ownershipMismatch] =
        await Promise.all([
            prisma.vendorProfile.count(),
            prisma.vendorProfile.count({ where: { profileKey: 'primary' } }),
            prisma.organizationPortalSubscription.count({ where: { portalKey: 'vendor' } }),
            prisma.$queryRaw<CountRow[]>`
                SELECT count(*)::bigint AS count
                FROM vendor_profiles vp
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM member m
                    JOIN member_portal_access mpa
                      ON mpa.member_id = m.id
                     AND mpa.portal_key = 'vendor'
                     AND mpa.enabled = true
                    WHERE m."organizationId" = vp.organization_id
                      AND m.role = 'owner'
                )
            `,
            prisma.$queryRaw<CountRow[]>`
                SELECT (
                    (SELECT count(*) FROM product_versions pv JOIN products p ON p.id = pv.product_id WHERE pv.vendor_profile_id <> p.vendor_profile_id) +
                    (SELECT count(*) FROM categories WHERE code IS NULL AND vendor_profile_id IS NULL) +
                    (SELECT count(*) FROM characteristic_templates WHERE key IS NULL AND vendor_profile_id IS NULL)
                )::bigint AS count
            `,
        ]);

    if (
        primaryProfiles !== profiles ||
        subscriptions !== profiles ||
        Number(missingOwnerAccess[0]?.count ?? 0) !== 0 ||
        Number(ownershipMismatch[0]?.count ?? 0) !== 0
    ) {
        throw new Error(
            `Vendor entitlement mismatch: profiles=${profiles}, primaryProfiles=${primaryProfiles}, subscriptions=${subscriptions}, missingOwnerAccess=${missingOwnerAccess[0]?.count ?? 0}, ownershipMismatch=${ownershipMismatch[0]?.count ?? 0}`
        );
    }

    console.log(
        `Vendor entitlements verified: ${profiles} Organizations have a primary Vendor Profile, Vendor Portal subscription, Owner access record, and profile-owned catalog data.`
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
