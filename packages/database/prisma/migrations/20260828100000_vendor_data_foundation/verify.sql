-- Run after migration with psql -v ON_ERROR_STOP=1 -f verify.sql.
-- Raises an exception if legacy product data was not preserved in the Original version.

DO $$
DECLARE
    product_count BIGINT;
    version_count BIGINT;
    mismatch_count BIGINT;
    unowned_image_count BIGINT;
BEGIN
    SELECT count(*) INTO product_count FROM "products";
    SELECT count(*) INTO version_count FROM "product_versions" WHERE "version_number" = 1;

    IF version_count <> product_count THEN
        RAISE EXCEPTION 'Expected % Original versions, found %', product_count, version_count;
    END IF;

    SELECT count(*) INTO mismatch_count
    FROM "products" p
    JOIN "product_versions" pv
      ON pv."product_id" = p."id" AND pv."version_number" = 1
    WHERE pv."label" <> 'Original'
       OR pv."is_primary" IS NOT TRUE
       OR pv."vendor_id" <> p."vendor_id"
       OR pv."sku" <> p."sku"
       OR pv."barcode" IS DISTINCT FROM p."barcode"
       OR pv."qr_code_url" IS DISTINCT FROM p."qr_code_url"
       OR pv."status" <> p."status"
       OR pv."characteristics" <> p."characteristics"
       OR pv."deleted_at" IS DISTINCT FROM p."deleted_at";

    IF mismatch_count <> 0 THEN
        RAISE EXCEPTION 'Found % Original versions with mismatched legacy data', mismatch_count;
    END IF;

    SELECT count(*) INTO unowned_image_count
    FROM "product_images"
    WHERE "product_version_id" IS NULL;

    IF unowned_image_count <> 0 THEN
        RAISE EXCEPTION 'Found % product images without version ownership', unowned_image_count;
    END IF;
END $$;

SELECT
    (SELECT count(*) FROM "products") AS product_count,
    (SELECT count(*) FROM "product_versions") AS version_count,
    (SELECT count(*) FROM "product_images") AS image_count,
    (SELECT count(*) FROM "product_images" WHERE "product_version_id" IS NOT NULL) AS version_owned_image_count;
