BEGIN;

-- During the stacked backend/frontend rollout, the previous API may still write only vendor_id.
-- Keep both ownership columns synchronized until the final authentication cleanup removes the
-- transitional Vendor ownership fields.
CREATE FUNCTION sync_vendor_profile_ownership() RETURNS trigger AS $$
DECLARE
    resolved_profile_id TEXT;
BEGIN
    IF NEW.vendor_id IS NULL THEN
        NEW.vendor_profile_id := NULL;
        RETURN NEW;
    END IF;

    SELECT id INTO resolved_profile_id
    FROM vendor_profiles
    WHERE legacy_vendor_id = NEW.vendor_id
      AND deleted_at IS NULL;

    IF resolved_profile_id IS NULL THEN
        RAISE EXCEPTION 'No active Vendor Profile exists for legacy Vendor %', NEW.vendor_id;
    END IF;

    IF NEW.vendor_profile_id IS NULL THEN
        NEW.vendor_profile_id := resolved_profile_id;
    ELSIF NEW.vendor_profile_id <> resolved_profile_id THEN
        RAISE EXCEPTION 'Vendor and Vendor Profile ownership do not match';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_sync_vendor_profile_ownership
    BEFORE INSERT OR UPDATE OF vendor_id, vendor_profile_id ON categories
    FOR EACH ROW EXECUTE FUNCTION sync_vendor_profile_ownership();
CREATE TRIGGER products_sync_vendor_profile_ownership
    BEFORE INSERT OR UPDATE OF vendor_id, vendor_profile_id ON products
    FOR EACH ROW EXECUTE FUNCTION sync_vendor_profile_ownership();
CREATE TRIGGER product_versions_sync_vendor_profile_ownership
    BEFORE INSERT OR UPDATE OF vendor_id, vendor_profile_id ON product_versions
    FOR EACH ROW EXECUTE FUNCTION sync_vendor_profile_ownership();
CREATE TRIGGER characteristic_templates_sync_vendor_profile_ownership
    BEFORE INSERT OR UPDATE OF vendor_id, vendor_profile_id ON characteristic_templates
    FOR EACH ROW EXECUTE FUNCTION sync_vendor_profile_ownership();

COMMIT;
