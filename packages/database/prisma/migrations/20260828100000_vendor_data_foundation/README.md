# Vendor data foundation migration

This migration is additive. It introduces the system-taxonomy fields, nullable system-template ownership, sellable product versions, version image ownership, normalized search text, and PostgreSQL trigram indexes.

Every existing product is copied into an `Original` version with version number `1`, the same vendor, SKU, barcode, QR URL, lifecycle status, characteristics, timestamps, and soft-delete state. Existing product image rows are assigned to that primary version. A legacy primary image URL is inserted into `product_images` only when no matching row exists.

## Validation before release

1. Confirm each product has exactly one version numbered `1` and exactly one non-deleted primary version.
2. Confirm product and version counts, SKUs, barcodes, QR URLs, statuses, characteristics, and soft-delete states match.
3. Confirm every existing `product_images` row has a `product_version_id`.
4. Confirm the partial primary-version index rejects a second active primary version.
5. Run the migration on a fresh database and on a copy of the current database before production deployment.

## Rollback

Application rollback is safe while transitional product columns remain. Revert the application to the pre-version release and leave the additive tables and columns in place.

If a database rollback is unavoidable, first verify no product/version/category/template writes occurred after deployment and take a backup. Then, in a transaction, drop the four trigram indexes, the product-version indexes and foreign keys, `product_images.product_version_id`, `product_versions`, the category default-template foreign key and columns, the template key/search/update columns, and `products.search_text`. Restore `characteristic_templates.vendor_id` to `NOT NULL` only after confirming there are no system templates with null ownership. Do not drop `pg_trgm` because another application may use the extension.
