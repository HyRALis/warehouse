import prisma from '../src/index.js';

interface CountRow {
    count: bigint;
}

async function main(): Promise<void> {
    const [
        vendors,
        profiles,
        primaryProfiles,
        subscriptions,
        missingOwnerAccess,
        ownershipMismatch,
    ] = await Promise.all([
        prisma.vendor.count(),
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
                    (SELECT count(*) FROM products WHERE vendor_profile_id IS NULL OR vendor_profile_id <> vendor_id) +
                    (SELECT count(*) FROM product_versions WHERE vendor_profile_id IS NULL OR vendor_profile_id <> vendor_id) +
                    (SELECT count(*) FROM categories WHERE vendor_profile_id IS DISTINCT FROM vendor_id) +
                    (SELECT count(*) FROM characteristic_templates WHERE vendor_profile_id IS DISTINCT FROM vendor_id)
                )::bigint AS count
            `,
    ]);

    if (
        profiles !== vendors ||
        primaryProfiles !== vendors ||
        subscriptions !== vendors ||
        Number(missingOwnerAccess[0]?.count ?? 0) !== 0 ||
        Number(ownershipMismatch[0]?.count ?? 0) !== 0
    ) {
        throw new Error(
            `Vendor entitlement migration mismatch: vendors=${vendors}, profiles=${profiles}, primaryProfiles=${primaryProfiles}, subscriptions=${subscriptions}, missingOwnerAccess=${missingOwnerAccess[0]?.count ?? 0}, ownershipMismatch=${ownershipMismatch[0]?.count ?? 0}`
        );
    }

    console.log(
        `Vendor entitlement migration verified: ${vendors} Organizations have a primary Vendor Profile, Vendor Portal subscription, Owner access record, and fully backfilled catalog ownership.`
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
