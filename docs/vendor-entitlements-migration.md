# Vendor Portal entitlements and Vendor Profile migration

## Purpose

This stage separates the producer/vendor identity from the person who authenticated. An
Organization owns the Vendor Portal subscription, a Member receives access, and a primary Vendor
Profile owns the catalog. The change is backend-only and remains compatible with the current
frontend and the preceding Better Auth compatibility facade.

## Model

```text
User
  -> Member -> Organization
                 -> OrganizationPortalSubscription -> Portal[vendor]
                 -> VendorProfile[primary]
  -> MemberPortalAccess -> Portal[vendor]

VendorProfile
  -> Products and versions
  -> Custom categories
  -> Custom characteristic templates
```

- `Portal` is data, keyed by the stable string `vendor`; adding a future portal does not require
  a database enum migration.
- `OrganizationPortalSubscription` is an entitlement, not billing. It records `ACTIVE`,
  `SUSPENDED`, or `CANCELLED`, start/end dates, and creation/update timestamps.
- `MemberPortalAccess` is an auditable enabled/disabled record with grant/update actors and
  timestamps. Owners have implicit access but still receive an initial record during onboarding.
- `VendorProfile` is the producer-facing identity and catalog owner. The schema can represent
  multiple keys later, while the service permits only `primary` in this release.
- `organizationId + profileKey` is unique, and the service converts a concurrent `P2002` into the
  stable `PRIMARY_PROFILE_EXISTS` error.

## Authorization

Every catalog request requires all of the following:

1. A valid Better Auth database session.
2. The session's active Organization and an actual membership in that Organization.
3. An active `vendor` subscription whose date window includes the current time.
4. Owner role or an enabled `MemberPortalAccess` record.
5. The Organization's non-deleted `primary` Vendor Profile.
6. If `X-Vendor-Profile-Id` is supplied, an exact match with that primary profile.

Catalog controllers filter on `vendorProfileId`. System categories and templates retain a null
profile owner. Transitional `vendorId` fields remain populated until the final authentication
cleanup PR, but they are no longer the authorization boundary.

Suspended, cancelled, future, or expired subscriptions return
`VENDOR_SUBSCRIPTION_INACTIVE`. Members without an explicit grant return
`VENDOR_PORTAL_ACCESS_DENIED`. A profile outside the active Organization returns
`VENDOR_PROFILE_ACCESS_DENIED`. These denials occur before a catalog query executes.

Only Owners can rename/deactivate the Vendor Profile or grant/revoke Member portal access. Owner
access is implicit and cannot be disabled. Better Auth continues to protect the final Owner from
removal or demotion.

## Onboarding transaction

Owner registration now creates all of these records in the same serializable transaction:

- legacy Vendor compatibility record during the additive rollout only;
- User and credential Account;
- Organization and Owner Member;
- `vendor` Portal upsert;
- active Organization subscription;
- enabled Owner access record; and
- primary Vendor Profile whose identifier preserves the legacy Vendor identifier.

Better Auth creates the session only after the graph commits. Invited users can authenticate and
accept membership, but cannot enter the Vendor Portal until an Owner explicitly grants access. The
temporary compatibility login returns an authenticated User envelope for invited Members even when
they correctly have no legacy Vendor record; legacy Owners continue to receive the legacy Vendor
envelope and transparent password rehash behavior.

## Backend contracts

- `GET /api/v1/platform/context` returns active Organization, membership, subscription state,
  effective access, and primary Vendor Profile. It uses session/membership authorization rather
  than portal-entry authorization so a suspended user can see the reason access is blocked.
- `GET /api/v1/platform/invitations/:invitationId` returns a deliberately limited, rate-limited
  invitation summary so a signed-out recipient can verify the Organization and invited email before
  creating an account. Unknown tokens return a generic not-found response.
- `GET /api/v1/platform/vendor-profile` returns the producer-facing primary profile.
- `PUT /api/v1/platform/vendor-profile` lets an Owner update its display name, description,
  website, and logo. The display name is mirrored to the transitional Vendor record in the same
  transaction while Organization naming remains independent.
- `GET /api/v1/platform/vendor/members` lists current-Organization members and effective Vendor
  Portal access for Owners.
- `PUT /api/v1/platform/vendor/members/:memberId/access` enables or disables explicit Member
  access. It rejects cross-Organization members, Owner records, non-Owner callers, and inactive
  subscriptions.

Shared platform contracts are exported from `@inventory-system/shared-types`. During the additive
transition, product, version, category, and template response contracts exposed
`vendorProfileId` while retaining `vendorId`. The final cleanup removes `vendorId`; current
contracts expose only VendorProfile ownership.

## Existing-data migration

Migration `20260902083000_vendor_entitlements`:

1. Creates the Portal, subscription, access, and Vendor Profile structures.
2. Seeds only the `vendor` Portal.
3. Creates one primary profile per legacy Vendor under its backfilled Organization, preserving the
   Vendor identifier as the profile identifier.
4. Creates one active Vendor subscription and enabled Owner access record per migrated profile.
5. Adds `vendor_profile_id` to products, versions, categories, and templates.
6. Backfills every custom/system ownership relationship and aborts on any mismatch.
7. Adds profile-scoped SKU/barcode constraints, indexes, and foreign keys.

Migration `20260902084500_entitlement_compatibility_triggers` keeps legacy and profile ownership
synchronized while stacked PRs roll out. If the previous API writes only `vendor_id`, a PostgreSQL
trigger resolves the active profile before constraints run. A mismatched Vendor/Profile pair is
rejected. These triggers and the old columns are removed only in the final backend cleanup.

Run the post-migration audit:

```sh
npm run entitlements:verify-migration --workspace @inventory-system/database
```

Before cleanup, the migration itself verifies profile/subscription/Vendor backfill counts and zero
transitional ownership mismatches. The maintained verifier checks primary-profile, subscription,
Owner-access, and final catalog-ownership invariants without querying removed Vendor fields.

## Verification

The entitlement integration test starts from the schema immediately before Better Auth,
constructs a legacy Vendor and custom catalog, applies the identity and entitlement migrations,
then verifies:

- stable primary profile identity and display name;
- active subscription and Owner access;
- product, version, category, and template ownership backfill;
- null system-record ownership;
- database rejection of a duplicate primary profile; and
- successful previous-backend insertion containing only `vendor_id` through the compatibility
  trigger.

API tests cover implicit Owner access, explicit Member access, subscription suspension, catalog
query suppression, cross-profile denial, Owner-only profile mutation, access grant/revocation,
Owner access protection, invited-Member compatibility login, public invitation summary isolation,
and primary-profile service errors.

## Rollout and rollback

1. Back up PostgreSQL and deploy both additive migrations.
2. Run `entitlements:verify-migration` and compare the Vendor/profile/subscription counts.
3. Deploy this API and verify `/api/v1/platform/context` for an existing Owner.
4. Confirm a suspended test subscription blocks catalog APIs and that restoring `ACTIVE` restores
   access.
5. Keep legacy ownership columns and synchronization triggers until the frontend and catalog
   hardening PRs have deployed.

The previous Better Auth API can be redeployed during the additive review window because
compatibility triggers populate profile ownership for its legacy catalog writes. Migration
`20260902213000_remove_legacy_vendor_auth` ends that window by dropping those triggers, legacy
columns, and the Vendor table. After that cleanup, only the cleanup API may run. Follow
[Vendor authentication cleanup and rollback](vendor-auth-cleanup.md) for the mandatory backup,
deployment order, post-migration audit, and recovery procedure.
