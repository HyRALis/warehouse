# Vendor authentication cleanup and rollback

## Scope

This stage completes the Better Auth cutover and makes `VendorProfile` the only owner of vendor
catalog data. It removes the former `Vendor` authentication/tenancy record, handwritten JWT
sessions, and transitional `vendorId` ownership columns. It does not add inventory models or
change product, version, category, template, media, import, export, or search behavior.

The public `/api/v1/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`,
and `/me` paths remain temporarily available because the open frontend authentication pull
request still calls them. These routes are no longer a second authentication system: they create
and read only Better Auth User, Account, Session, Organization, Member, entitlement, and
VendorProfile records. They return the established response envelope so backend cleanup can merge
without breaking the stacked frontend branch.

## Final ownership model

- `User` is the authenticating person.
- `Account` contains the credential hash and supports transparent bcrypt-to-scrypt rehashing.
- `Session` is the only session record.
- `Organization` owns the Vendor Portal subscription.
- `Member` and `MemberPortalAccess` decide who may enter the portal.
- `VendorProfile` is the producer identity and sole catalog tenant.
- Products and versions always have a `vendorProfileId`.
- Categories and templates have a null `vendorProfileId` only when they are system records.

Deactivating a vendor closes only the active Organization's Vendor Portal. It deletes sessions
for that Organization context, cancels its subscription, disables explicit member access, and
soft-deletes the primary VendorProfile. It does not delete a User who may belong to another
Organization.

## Destructive migration

Migration `20260902213000_remove_legacy_vendor_auth` runs in one PostgreSQL transaction and aborts
before dropping anything unless every legacy Vendor has all of the following:

1. A migrated Better Auth User and credential Account with a password hash.
2. A primary VendorProfile.
3. An Owner membership connecting that User to the profile's Organization.
4. A Vendor Portal subscription for that Organization.
5. Matching transitional and final owners for every product, version, custom category, and custom
   template.
6. Product-version ownership matching the parent product.

After the guards pass, the migration cancels subscriptions belonging to already-deleted profiles,
removes the compatibility triggers and function, drops legacy foreign keys and indexes, removes
the legacy ownership columns, and drops `vendors` last.

The application schema and shared contracts no longer expose `legacyVendorId` or `vendorId`.
The `jsonwebtoken` dependency and handwritten session service are removed. `BETTER_AUTH_SECRET` is
the only application authentication secret.

## Deployment procedure

1. Merge and deploy the preceding identity, entitlement, catalog, and boundary-hardening changes.
2. Put the API into a maintenance window so no older application instance can write during the
   destructive migration.
3. Take a restorable PostgreSQL backup and record the deployed application commit and migration
   status.
4. Run the additive audits before the cleanup:

    ```sh
    npm run auth:verify-migration --workspace @inventory-system/database
    npm run entitlements:verify-migration --workspace @inventory-system/database
    ```

5. Apply migrations with `prisma migrate deploy`.
6. Run the final audit:

    ```sh
    npm run auth:verify-cleanup --workspace @inventory-system/database
    ```

7. Deploy the cleanup API before restoring traffic. Do not run an older API against the cleaned
   schema.
8. Verify existing-owner login, invited-member login, active Organization selection, profile
   update, and Vendor Portal deactivation.

## Verification

The database integration suite uses disposable PostgreSQL databases and covers:

- clean installation and idempotent system seeding;
- migration from a pre-Better-Auth Vendor with an uppercase email, bcrypt password, and unused
  reset token;
- creation of the User, credential Account, Owner Organization, subscription, access, and primary
  profile graph;
- ownership backfill for products, versions, categories, and templates;
- an old-API `vendor_id` write through the temporary compatibility trigger;
- removal of the Vendor table, legacy columns, and compatibility triggers; and
- preservation of credentials and all catalog ownership after cleanup.

Run it locally without changing the configured development database:

```sh
npm run test:integration:local --workspace @inventory-system/database
```

The command creates uniquely named temporary databases and drops them after the tests.

API tests cover registration, existing bcrypt login and rehash, invited-member login, session
authorization, Owner-only profile mutation/deactivation, subscription and member-access checks,
and cross-profile catalog denial.

## Rollback

This migration has no automatic down migration. Once it succeeds, an older application cannot
operate because its Vendor table and `vendor_id` columns no longer exist.

If a failure occurs before the transaction commits, PostgreSQL restores the previous schema
automatically. If a problem is discovered after commit, keep traffic stopped and choose one of:

- restore the verified pre-migration database backup and redeploy the exact pre-cleanup API; or
- keep the new schema and deploy an audited forward fix.

Do not recreate an empty Vendor table, manually repopulate removed columns, or deploy an older API
against the cleaned database. Any registrations or catalog writes accepted after the backup make
a database restore lossy; in that case use a forward repair or reconcile those writes explicitly
before restoration.

## Deferred work

Removing the established `/api/v1/auth` URL bridge is deferred until all frontend consumers use
native Better Auth client calls. That later change is a routing cleanup only and must not re-add a
second credential or session implementation. Inventory roles and permissions remain outside this
Vendor Portal release.
