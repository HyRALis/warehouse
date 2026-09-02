BEGIN;

-- Portal subscription state is data-driven by Portal key; only the subscription lifecycle is an enum.
CREATE TYPE "PortalSubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

CREATE TABLE "portals" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "portals_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "organization_portal_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "portal_key" TEXT NOT NULL,
    "status" "PortalSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_portal_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_portal_access" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "portal_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "granted_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_portal_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "profile_key" TEXT NOT NULL DEFAULT 'primary',
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "logo_url" TEXT,
    "legacy_vendor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "categories" ADD COLUMN "vendor_profile_id" TEXT;
ALTER TABLE "products" ADD COLUMN "vendor_profile_id" TEXT;
ALTER TABLE "product_versions" ADD COLUMN "vendor_profile_id" TEXT;
ALTER TABLE "characteristic_templates" ADD COLUMN "vendor_profile_id" TEXT;

INSERT INTO "portals" ("key", "name", "description", "updated_at")
VALUES (
    'vendor',
    'Vendor Portal',
    'Producer and vendor catalog management portal',
    CURRENT_TIMESTAMP
);

-- Preserve the legacy Vendor identifier as the primary Vendor Profile identifier. The previous
-- identity migration created one owner Organization per Vendor; abort later if that invariant is
-- not satisfied instead of guessing between organizations.
INSERT INTO "vendor_profiles" (
    "id",
    "organization_id",
    "profile_key",
    "display_name",
    "legacy_vendor_id",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT
    v."id",
    m."organizationId",
    'primary',
    v."company_name",
    v."id",
    v."created_at",
    v."updated_at",
    v."deleted_at"
FROM "vendors" v
JOIN "user" u ON u."legacyVendorId" = v."id"
JOIN "member" m ON m."userId" = u."id" AND m."role" = 'owner';

INSERT INTO "organization_portal_subscriptions" (
    "id",
    "organization_id",
    "portal_key",
    "status",
    "starts_at",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    vp."organization_id",
    'vendor',
    'ACTIVE',
    vp."created_at",
    vp."created_at",
    CURRENT_TIMESTAMP
FROM "vendor_profiles" vp;

INSERT INTO "member_portal_access" (
    "id",
    "member_id",
    "portal_key",
    "enabled",
    "granted_by_user_id",
    "updated_by_user_id",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    m."id",
    'vendor',
    true,
    m."userId",
    m."userId",
    m."createdAt",
    CURRENT_TIMESTAMP
FROM "member" m
JOIN "vendor_profiles" vp ON vp."organization_id" = m."organizationId"
WHERE m."role" = 'owner';

UPDATE "categories" SET "vendor_profile_id" = "vendor_id" WHERE "vendor_id" IS NOT NULL;
UPDATE "products" SET "vendor_profile_id" = "vendor_id";
UPDATE "product_versions" SET "vendor_profile_id" = "vendor_id";
UPDATE "characteristic_templates" SET "vendor_profile_id" = "vendor_id" WHERE "vendor_id" IS NOT NULL;

DO $$
DECLARE
    vendor_count BIGINT;
BEGIN
    SELECT count(*) INTO vendor_count FROM "vendors";

    IF (SELECT count(*) FROM "vendor_profiles") <> vendor_count
       OR (SELECT count(*) FROM "organization_portal_subscriptions" WHERE "portal_key" = 'vendor') <> vendor_count
       OR (SELECT count(*) FROM "member_portal_access" WHERE "portal_key" = 'vendor' AND "enabled") <> vendor_count
       OR EXISTS (SELECT 1 FROM "products" WHERE "vendor_profile_id" IS NULL)
       OR EXISTS (SELECT 1 FROM "product_versions" WHERE "vendor_profile_id" IS NULL)
       OR EXISTS (SELECT 1 FROM "categories" WHERE "vendor_id" IS DISTINCT FROM "vendor_profile_id")
       OR EXISTS (SELECT 1 FROM "characteristic_templates" WHERE "vendor_id" IS DISTINCT FROM "vendor_profile_id") THEN
        RAISE EXCEPTION 'Vendor entitlement or catalog ownership backfill mismatch';
    END IF;
END $$;

ALTER TABLE "products" ALTER COLUMN "vendor_profile_id" SET NOT NULL;
ALTER TABLE "product_versions" ALTER COLUMN "vendor_profile_id" SET NOT NULL;

CREATE UNIQUE INDEX "organization_portal_subscriptions_organization_id_portal_key_key"
    ON "organization_portal_subscriptions"("organization_id", "portal_key");
CREATE INDEX "organization_portal_subscriptions_portal_key_status_idx"
    ON "organization_portal_subscriptions"("portal_key", "status");
CREATE UNIQUE INDEX "member_portal_access_member_id_portal_key_key"
    ON "member_portal_access"("member_id", "portal_key");
CREATE INDEX "member_portal_access_portal_key_enabled_idx"
    ON "member_portal_access"("portal_key", "enabled");
CREATE INDEX "member_portal_access_granted_by_user_id_idx"
    ON "member_portal_access"("granted_by_user_id");
CREATE INDEX "member_portal_access_updated_by_user_id_idx"
    ON "member_portal_access"("updated_by_user_id");
CREATE UNIQUE INDEX "vendor_profiles_legacy_vendor_id_key" ON "vendor_profiles"("legacy_vendor_id");
CREATE UNIQUE INDEX "vendor_profiles_organization_id_profile_key_key"
    ON "vendor_profiles"("organization_id", "profile_key");
CREATE INDEX "vendor_profiles_organization_id_deleted_at_idx"
    ON "vendor_profiles"("organization_id", "deleted_at");
CREATE INDEX "categories_vendor_profile_id_idx" ON "categories"("vendor_profile_id");
CREATE UNIQUE INDEX "products_vendor_profile_id_sku_key" ON "products"("vendor_profile_id", "sku");
CREATE INDEX "products_vendor_profile_id_deleted_at_idx" ON "products"("vendor_profile_id", "deleted_at");
CREATE UNIQUE INDEX "product_versions_vendor_profile_id_sku_key"
    ON "product_versions"("vendor_profile_id", "sku");
CREATE UNIQUE INDEX "product_versions_vendor_profile_id_barcode_key"
    ON "product_versions"("vendor_profile_id", "barcode");
CREATE INDEX "product_versions_vendor_profile_id_deleted_at_idx"
    ON "product_versions"("vendor_profile_id", "deleted_at");
CREATE INDEX "characteristic_templates_vendor_profile_id_idx"
    ON "characteristic_templates"("vendor_profile_id");

ALTER TABLE "organization_portal_subscriptions"
    ADD CONSTRAINT "organization_portal_subscriptions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_portal_subscriptions"
    ADD CONSTRAINT "organization_portal_subscriptions_portal_key_fkey"
    FOREIGN KEY ("portal_key") REFERENCES "portals"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_portal_access"
    ADD CONSTRAINT "member_portal_access_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_portal_access"
    ADD CONSTRAINT "member_portal_access_portal_key_fkey"
    FOREIGN KEY ("portal_key") REFERENCES "portals"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_portal_access"
    ADD CONSTRAINT "member_portal_access_granted_by_user_id_fkey"
    FOREIGN KEY ("granted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "member_portal_access"
    ADD CONSTRAINT "member_portal_access_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_legacy_vendor_id_fkey"
    FOREIGN KEY ("legacy_vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories"
    ADD CONSTRAINT "categories_vendor_profile_id_fkey"
    FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products"
    ADD CONSTRAINT "products_vendor_profile_id_fkey"
    FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_versions"
    ADD CONSTRAINT "product_versions_vendor_profile_id_fkey"
    FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "characteristic_templates"
    ADD CONSTRAINT "characteristic_templates_vendor_profile_id_fkey"
    FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
