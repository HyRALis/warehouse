-- Additive Vendor Portal data foundation.
-- Transitional product columns remain in place until the release-hardening migration.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE "categories"
    ADD COLUMN "code" TEXT,
    ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "default_template_id" TEXT,
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "characteristic_templates"
    ALTER COLUMN "vendor_id" DROP NOT NULL,
    ADD COLUMN "key" TEXT,
    ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "products"
    ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '';

CREATE TABLE "product_versions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "qr_code_url" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "characteristics" JSONB NOT NULL DEFAULT '[]',
    "design_notes" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "search_text" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "product_images"
    ADD COLUMN "product_version_id" TEXT;

CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");
CREATE UNIQUE INDEX "characteristic_templates_key_key" ON "characteristic_templates"("key");
CREATE INDEX "categories_default_template_id_idx" ON "categories"("default_template_id");
CREATE INDEX "product_images_product_version_id_idx" ON "product_images"("product_version_id");
CREATE UNIQUE INDEX "product_versions_product_id_version_number_key"
    ON "product_versions"("product_id", "version_number");
CREATE UNIQUE INDEX "product_versions_vendor_id_sku_key"
    ON "product_versions"("vendor_id", "sku");
CREATE UNIQUE INDEX "product_versions_vendor_id_barcode_key"
    ON "product_versions"("vendor_id", "barcode");
CREATE INDEX "product_versions_product_id_deleted_at_idx"
    ON "product_versions"("product_id", "deleted_at");
CREATE INDEX "product_versions_vendor_id_deleted_at_idx"
    ON "product_versions"("vendor_id", "deleted_at");
CREATE UNIQUE INDEX "product_versions_one_primary_idx"
    ON "product_versions"("product_id")
    WHERE "is_primary" = true AND "deleted_at" IS NULL;

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_default_template_id_fkey"
    FOREIGN KEY ("default_template_id") REFERENCES "characteristic_templates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_versions"
    ADD CONSTRAINT "product_versions_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_versions"
    ADD CONSTRAINT "product_versions_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_version_id_fkey"
    FOREIGN KEY ("product_version_id") REFERENCES "product_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "categories"
SET "search_text" = lower(concat_ws(' ', "name", "code", array_to_string("aliases", ' ')));

UPDATE "characteristic_templates"
SET "search_text" = lower(concat_ws(' ', "name", "key", "fields"::text));

UPDATE "products"
SET "search_text" = lower(concat_ws(' ', "base_name", "sku", "barcode", "status"::text, "characteristics"::text));

INSERT INTO "product_versions" (
    "id",
    "product_id",
    "vendor_id",
    "version_number",
    "label",
    "sku",
    "barcode",
    "qr_code_url",
    "status",
    "characteristics",
    "is_primary",
    "search_text",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "vendor_id",
    1,
    'Original',
    "sku",
    "barcode",
    "qr_code_url",
    "status",
    "characteristics",
    true,
    lower(concat_ws(' ', 'Original', "sku", "barcode", "status"::text, "characteristics"::text)),
    "created_at",
    "updated_at",
    "deleted_at"
FROM "products";

-- Preserve legacy primary image URLs even if an old product predates the image table workflow.
INSERT INTO "product_images" ("id", "product_id", "image_url", "sort_order", "created_at")
SELECT gen_random_uuid()::text, p."id", p."image_url", 0, p."created_at"
FROM "products" p
WHERE p."image_url" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "product_images" pi
      WHERE pi."product_id" = p."id" AND pi."image_url" = p."image_url"
  );

UPDATE "product_images" pi
SET "product_version_id" = pv."id"
FROM "product_versions" pv
WHERE pv."product_id" = pi."product_id" AND pv."is_primary" = true;

CREATE INDEX "categories_search_text_trgm_idx"
    ON "categories" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "characteristic_templates_search_text_trgm_idx"
    ON "characteristic_templates" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "products_search_text_trgm_idx"
    ON "products" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "product_versions_search_text_trgm_idx"
    ON "product_versions" USING GIN ("search_text" gin_trgm_ops);
