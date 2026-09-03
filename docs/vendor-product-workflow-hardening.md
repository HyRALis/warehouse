# Vendor product and version workflow hardening

## Purpose

This stage finishes the product-first path a vendor is most likely to use after onboarding. A
vendor can create a minimal product, recover when category/template data is temporarily
unavailable, edit the product later, and manage its sellable versions without leaving the product
detail page. It deliberately does not change universal-search ranking or add inventory behavior.

## User-visible behavior

- Product details can be edited in place: name, primary SKU, primary barcode, category, and
  Draft, Active, or Discontinued status.
- Changing a primary identifier keeps the product and its primary version synchronized through
  the existing backend contract.
- Category and template load failures on product creation remain recoverable. The form explains
  the problem, disables dependent controls, and offers Retry instead of discarding entered data.
- Product-detail actions report errors locally. A failed lifecycle or delete action no longer
  replaces the entire page with a load-error screen.
- Version creation protects Copy Existing mode from an empty source selection.
- Image uploads accept JPEG, PNG, and WebP files up to 2 MB and reject invalid files before an
  R2 request is attempted. A failed upload leaves the product or version intact and can be
  retried.
- Version cards continue to expose primary, Draft, Active, Discontinued, and effective lifecycle
  state, along with copy, comparison, QR, media, and guarded deletion actions.

## Why this implementation

The product page remains the single working surface for product and version maintenance. Inline
editing avoids a second route and keeps lifecycle context visible. Category selection reuses the
shared searchable selector, so system and vendor-owned categories behave consistently across
create and edit flows. Client-side media checks give immediate feedback while the API remains the
authoritative validation and tenancy boundary.

Storybook uses the official Next.js Vite framework and accessibility addon. It isolates the
highest-risk product components without introducing another application runtime. Stories cover
the collapsed editor, active and draft version states, and desktop/mobile quick-create entry
points.

## Contracts and data

No schema or public endpoint is added in this stage. The UI consumes the existing
Vendor-Profile-scoped product/version endpoints and the shared `ProductResponse`, status, and
comparison types. The custom-category grouping key is `vendorProfileId`; the removed legacy
`vendorId` field is no longer referenced.

## Security and tenancy

The browser never supplies or persists an arbitrary Organization or Vendor Profile identifier for
these operations. The authenticated backend context resolves them and enforces ownership. UI
validation improves feedback but does not replace API validation, identifier uniqueness checks,
system-record immutability, or media authorization.

## Verification

Run from the repository root:

```powershell
npm.cmd test --workspace @inventory-system/vendor-portal
npm.cmd run build --workspace @inventory-system/vendor-portal
npm.cmd run lint --workspace @inventory-system/vendor-portal
npm.cmd run build-storybook --workspace @inventory-system/vendor-portal
```

The component suite verifies successful product edits, recoverable API conflicts, product-create
dependency retries, lifecycle actions, copy-source safety, image validation, category grouping,
and the existing version workflows. The static Storybook build is reviewed at desktop and mobile
sizes. Existing `next/image` migration warnings are deferred to the accessibility/responsive
stage; they do not fail lint.

## Rollback

This is a frontend-only change. Reverting its commits restores the prior product screens without
database migration or catalog-data rollback. Storybook dependencies, configuration, and scripts
can be reverted independently from the runtime workflow changes.

## Deferred work

- Full keyboard, screen-reader, reduced-motion, contrast, and mobile regression coverage belongs
  to the dedicated accessibility stage.
- Catalog/template/search/import empty and partial-error states belong to the next frontend stage.
- Universal-search tuning remains intentionally limited to the already implemented safe ranking
  and tenant isolation.
- Inventory quantities, locations, purchasing, receiving, and sales deductions remain out of
  scope for the Vendor Portal release.
