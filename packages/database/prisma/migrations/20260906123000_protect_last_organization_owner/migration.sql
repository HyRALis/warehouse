-- Application hooks give friendly errors but do not serialize concurrent member mutations.
-- Guard every owner loss at the database boundary, including user-deletion cascades.
CREATE FUNCTION protect_last_organization_owner() RETURNS trigger
LANGUAGE plpgsql VOLATILE AS $$
BEGIN
    IF NOT ('owner' = ANY(regexp_split_to_array(OLD.role, '\s*,\s*'))) THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF NEW."organizationId" = OLD."organizationId"
           AND 'owner' = ANY(regexp_split_to_array(NEW.role, '\s*,\s*')) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- A real row update (even with unchanged name) serializes owner loss and forces
    -- stale Repeatable Read/Serializable transactions to abort, unlike a lock alone.
    UPDATE "organization" SET name = name WHERE id = OLD."organizationId";
    -- An explicitly deleted organization may cascade its members. Native deletion
    -- remains disabled in Better Auth; profile FKs additionally restrict deletion.
    IF FOUND AND NOT EXISTS (
        SELECT 1 FROM "member"
        WHERE "organizationId" = OLD."organizationId" AND id <> OLD.id
          AND 'owner' = ANY(regexp_split_to_array(role, '\s*,\s*'))
    ) THEN
        RAISE EXCEPTION 'The last Owner cannot be removed or demoted'
            USING ERRCODE = '23514', CONSTRAINT = 'organization_last_owner_required';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER member_protect_last_owner
BEFORE DELETE OR UPDATE OF role, "organizationId" ON "member"
FOR EACH ROW EXECUTE FUNCTION protect_last_organization_owner();
