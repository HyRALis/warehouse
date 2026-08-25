-- Phase 0 authentication, tenant uniqueness, and query/index hardening.
ALTER TABLE "vendors"
    ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "password_reset_token_hash" TEXT,
    ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "vendors_password_reset_token_hash_key"
    ON "vendors"("password_reset_token_hash");

DROP INDEX "products_sku_key";
CREATE UNIQUE INDEX "products_vendor_id_sku_key" ON "products"("vendor_id", "sku");

CREATE INDEX "categories_vendor_id_idx" ON "categories"("vendor_id");
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX "products_vendor_id_deleted_at_idx" ON "products"("vendor_id", "deleted_at");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");
CREATE INDEX "characteristic_templates_vendor_id_idx"
    ON "characteristic_templates"("vendor_id");

ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";
ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" DROP CONSTRAINT "categories_vendor_id_fkey";
ALTER TABLE "categories"
    ADD CONSTRAINT "categories_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";
ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
