# Vendor catalog tenancy and lifecycle hardening

## Purpose

This stage makes the existing product, version, category, and template APIs safe to use through
Organization membership and a primary Vendor Profile. It does not add inventory behavior or new
catalog features. Its job is to make ownership boundaries, lifecycle state, and denormalized primary
version data reliable before media, import, search, and authentication cleanup stages build on them.

## Ownership rules

Every catalog route continues to require an authenticated Better Auth session, an active
Organization membership, an active Vendor Portal subscription, Owner or explicit Member portal
access, and the Organization's primary Vendor Profile.

Product and version reads and writes are filtered by `vendorProfileId`. System categories and
templates are readable by every entitled Vendor Profile but remain immutable. Custom category and
template mutation now looks up only system records or records owned by the active Vendor Profile:

- a system record returns a stable `SYSTEM_CATEGORY_READ_ONLY` or `SYSTEM_TEMPLATE_READ_ONLY`
  response;
- another Vendor Profile's identifier is indistinguishable from an unknown identifier and returns
  not found; and
- an owned custom record can be changed only after its referenced parent/template is also proven
  available to the same profile.

This avoids using a forbidden response as an identifier-existence oracle across tenants.

## Product and primary-version consistency

The Product row intentionally mirrors the primary version's SKU, barcode, characteristics, image,
and QR reference while product name, category, and product lifecycle state remain product-level.
These mirrored fields support transitional clients and fast product-list reads.

Product edits now acquire a PostgreSQL row lock and run at serializable isolation. SKU, barcode, and
characteristic changes update the primary Product Version in the same transaction. Name, category,
SKU, and barcode changes rebuild both search-text projections. A missing primary version is treated
as an invariant conflict instead of silently allowing the two records to diverge.

Setting or creating a primary version also refreshes the Product search projection and representative
image. Generated QR updates remain optional and happen after the catalog transaction, preserving the
existing partial-failure contract.

## Lifecycle and concurrency

Product and version statuses remain independent and support `DRAFT`, `ACTIVE`, and
`DISCONTINUED`. Effective version status is derived as follows:

- either level discontinued → `DISCONTINUED`;
- both levels active → `ACTIVE`; and
- every other combination → `DRAFT`.

Creating, editing, selecting, or deleting a version serializes on the parent Product row. The lock
rechecks both Vendor Profile ownership and non-deleted state inside the transaction. A primary
version cannot be deleted, and the last remaining version cannot be deleted. Concurrent serialization
failures return a retryable conflict rather than a generic server error. The database's partial unique
index remains the final guard allowing at most one non-deleted primary version per Product.

## Validation and API behavior

Product edits now require at least one field. Names and SKUs are trimmed and bounded, characteristics
retain their item limit, and a barcode is cleared explicitly with `null`. Identifier uniqueness
violations return `IDENTIFIER_CONFLICT`; serialization conflicts return `PRODUCT_CONFLICT` or
`VERSION_CONFLICT`.

No migration is required. Transitional `vendorId` fields and compatibility triggers remain until the
dedicated authentication cleanup PR.

## Verification

API coverage verifies:

- system category/template mutation denial;
- cross-profile category/template identifiers return not found;
- cross-profile product/version reads and writes are denied;
- transactional Product/primary-version mirroring;
- product and version status combinations;
- row-lock ownership rechecks;
- serialized primary selection and deletion;
- primary and last-version deletion guards; and
- identifier and concurrent-write conflict responses.

TypeScript, API build, complete API tests, monorepo tests, lint, and the production dependency audit
are required before the PR is opened.

## Rollback

This stage is application-only and additive at the contract level. Reverting the branch restores the
previous controller behavior without a database rollback. Existing product/version/category/template
records remain compatible. If writes occurred while this version was deployed, preserve them: the
transactional mirroring only brings Product and primary-version fields back into agreement.

## Deferred work

R2 failure cleanup, media-reference regression coverage, CSV limits and row reporting, universal
search benchmarks, legacy ownership-column removal, custom roles, and inventory permissions remain
in their later stages.
