BEGIN;

-- Destructive cleanup is allowed only after every legacy Vendor has a complete Better Auth,
-- Organization, entitlement, and primary Vendor Profile graph and every catalog row agrees on
-- its transitional and final owner.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "vendors" v
        LEFT JOIN "user" u ON u."legacyVendorId" = v."id"
        LEFT JOIN "account" a
          ON a."userId" = u."id"
         AND a."issuer" = 'local:credential'
         AND a."providerId" = 'credential'
         AND a."password" IS NOT NULL
        LEFT JOIN "vendor_profiles" vp ON vp."legacy_vendor_id" = v."id"
        LEFT JOIN "member" m
          ON m."organizationId" = vp."organization_id"
         AND m."userId" = u."id"
         AND 'owner' = ANY(regexp_split_to_array(m."role", '\s*,\s*'))
        LEFT JOIN "organization_portal_subscriptions" ops
          ON ops."organization_id" = vp."organization_id"
         AND ops."portal_key" = 'vendor'
        WHERE u."id" IS NULL
           OR a."id" IS NULL
           OR vp."id" IS NULL
           OR m."id" IS NULL
           OR ops."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Legacy Vendor identity or entitlement migration is incomplete';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "products"
        WHERE "vendor_profile_id" IS NULL OR "vendor_id" IS DISTINCT FROM "vendor_profile_id"
    ) OR EXISTS (
        SELECT 1 FROM "product_versions" pv
        JOIN "products" p ON p."id" = pv."product_id"
        WHERE pv."vendor_profile_id" IS NULL
           OR pv."vendor_id" IS DISTINCT FROM pv."vendor_profile_id"
           OR pv."vendor_profile_id" IS DISTINCT FROM p."vendor_profile_id"
    ) OR EXISTS (
        SELECT 1 FROM "categories"
        WHERE "vendor_id" IS DISTINCT FROM "vendor_profile_id"
    ) OR EXISTS (
        SELECT 1 FROM "characteristic_templates"
        WHERE "vendor_id" IS DISTINCT FROM "vendor_profile_id"
    ) THEN
        RAISE EXCEPTION 'Catalog Vendor Profile ownership migration is incomplete';
    END IF;
END $$;

-- A deleted legacy Vendor was already represented by a deleted Vendor Profile. Its Organization
-- entitlement must no longer remain active once the Vendor table is gone.
UPDATE "organization_portal_subscriptions" ops
SET
    "status" = 'CANCELLED',
    "ends_at" = COALESCE(ops."ends_at", vp."deleted_at", CURRENT_TIMESTAMP),
    "updated_at" = CURRENT_TIMESTAMP
FROM "vendor_profiles" vp
WHERE vp."organization_id" = ops."organization_id"
  AND ops."portal_key" = 'vendor'
  AND vp."deleted_at" IS NOT NULL
  AND ops."status" <> 'CANCELLED';

DROP TRIGGER IF EXISTS categories_sync_vendor_profile_ownership ON "categories";
DROP TRIGGER IF EXISTS products_sync_vendor_profile_ownership ON "products";
DROP TRIGGER IF EXISTS product_versions_sync_vendor_profile_ownership ON "product_versions";
DROP TRIGGER IF EXISTS characteristic_templates_sync_vendor_profile_ownership ON "characteristic_templates";
DROP FUNCTION IF EXISTS sync_vendor_profile_ownership();

ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_legacyVendorId_fkey";
ALTER TABLE "vendor_profiles" DROP CONSTRAINT IF EXISTS "vendor_profiles_legacy_vendor_id_fkey";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_vendor_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_vendor_id_fkey";
ALTER TABLE "product_versions" DROP CONSTRAINT IF EXISTS "product_versions_vendor_id_fkey";
ALTER TABLE "characteristic_templates" DROP CONSTRAINT IF EXISTS "characteristic_templates_vendor_id_fkey";

DROP INDEX IF EXISTS "user_legacyVendorId_key";
DROP INDEX IF EXISTS "vendor_profiles_legacy_vendor_id_key";
DROP INDEX IF EXISTS "categories_vendor_id_idx";
DROP INDEX IF EXISTS "products_vendor_id_sku_key";
DROP INDEX IF EXISTS "products_vendor_id_deleted_at_idx";
DROP INDEX IF EXISTS "product_versions_vendor_id_sku_key";
DROP INDEX IF EXISTS "product_versions_vendor_id_barcode_key";
DROP INDEX IF EXISTS "product_versions_vendor_id_deleted_at_idx";
DROP INDEX IF EXISTS "characteristic_templates_vendor_id_idx";

ALTER TABLE "user" DROP COLUMN "legacyVendorId";
ALTER TABLE "vendor_profiles" DROP COLUMN "legacy_vendor_id";
ALTER TABLE "categories" DROP COLUMN "vendor_id";
ALTER TABLE "products" DROP COLUMN "vendor_id";
ALTER TABLE "product_versions" DROP COLUMN "vendor_id";
ALTER TABLE "characteristic_templates" DROP COLUMN "vendor_id";

DROP TABLE "vendors";

COMMIT;
