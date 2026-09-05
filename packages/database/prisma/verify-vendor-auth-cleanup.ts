import prisma from '../src/index.js';

interface NamedRecord {
    name: string;
}

interface CountRecord {
    count: bigint | number;
}

async function main(): Promise<void> {
    const [legacyTables, legacyColumns, legacyTriggers, mismatchedVersions, invalidSubscriptions] =
        await Promise.all([
            prisma.$queryRaw<NamedRecord[]>`
                SELECT table_name AS name
                FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'vendors'
            `,
            prisma.$queryRaw<NamedRecord[]>`
                SELECT table_name || '.' || column_name AS name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND (
                      (table_name = 'user' AND column_name = 'legacyVendorId')
                      OR (table_name = 'vendor_profiles' AND column_name = 'legacy_vendor_id')
                      OR (table_name IN ('categories', 'products', 'product_versions', 'characteristic_templates') AND column_name = 'vendor_id')
                  )
            `,
            prisma.$queryRaw<NamedRecord[]>`
                SELECT trigger_name AS name
                FROM information_schema.triggers
                WHERE trigger_schema = current_schema()
                  AND trigger_name LIKE '%sync_vendor_profile_ownership'
            `,
            prisma.$queryRaw<CountRecord[]>`
                SELECT count(*)::integer AS count
                FROM product_versions pv
                JOIN products p ON p.id = pv.product_id
                WHERE pv.vendor_profile_id IS DISTINCT FROM p.vendor_profile_id
            `,
            prisma.$queryRaw<CountRecord[]>`
                SELECT count(*)::integer AS count
                FROM vendor_profiles vp
                JOIN organization_portal_subscriptions ops
                  ON ops.organization_id = vp.organization_id
                 AND ops.portal_key = 'vendor'
                WHERE vp.deleted_at IS NOT NULL AND ops.status = 'ACTIVE'
            `,
        ]);

    const leftovers = [...legacyTables, ...legacyColumns, ...legacyTriggers];
    if (leftovers.length > 0) {
        throw new Error(
            `Legacy Vendor structures remain: ${leftovers.map((item) => item.name).join(', ')}`
        );
    }
    if (Number(mismatchedVersions[0]?.count ?? 0) > 0) {
        throw new Error(
            'A Product Version is owned by a different Vendor Profile than its Product'
        );
    }
    if (Number(invalidSubscriptions[0]?.count ?? 0) > 0) {
        throw new Error('A deleted Vendor Profile still has an active Vendor Portal subscription');
    }

    const [users, profiles, products, versions] = await Promise.all([
        prisma.user.count(),
        prisma.vendorProfile.count(),
        prisma.product.count(),
        prisma.productVersion.count(),
    ]);
    console.log(
        `Vendor cleanup verified: ${users} users, ${profiles} profiles, ${products} products, ${versions} versions, and no legacy Vendor structures.`
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
