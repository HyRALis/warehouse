# Vendor catalog, search, and CSV workflow hardening

## Purpose

This stage completes the advanced catalog workflows that support product creation without making
them prerequisites for a first-time vendor. Categories and templates stay in Advanced setup,
universal search remains a straightforward catalog finder, and CSV import/export provides a
recoverable path for larger catalogs.

## User-visible behavior

### Categories

- System categories remain visibly read-only; Vendor Profile-owned categories retain edit and
  guarded delete actions.
- Name, code, alias, and parent search continues to filter both ownership groups.
- A failed initial category/template dependency request shows a Retry action instead of an empty
  catalog.
- Save and safe-deletion errors remain local to the page without discarding loaded records.
- The `?create=true` quick-create entry point continues to open the custom-category form.

### Characteristic templates

- System templates remain read-only and can be duplicated into the active Vendor Profile.
- Duplication has an explicit busy state and announces successful completion.
- Custom templates retain edit/delete actions and in-use deletion conflicts from the API.
- A failed initial load is retryable, and template/field-name search remains client-side because
  the seeded template set is intentionally small.

### Universal search

- Results keep their URL-persisted query, entity filters, page, retry state, and product-version
  deep links.
- Invalid page values fall back to page 1 and unknown entity filters are not sent to the API.
- Search remains deliberately simple: the existing backend ranking and tenant-isolation behavior
  are retained, with no additional index, cache, external engine, or ranking framework.

### CSV import/export

- The browser rejects non-CSV files and files over 5 MB before upload; the API remains
  authoritative for content, row count, identifiers, categories, statuses, and tenancy.
- Failed imports retain the selected file so the vendor can retry without selecting it again.
- Successful imports clear the file chooser, including its native value so the same filename can
  be selected later.
- Import summaries and row-level errors are announced and the full error list remains
  downloadable.
- Export failures are shown independently and do not erase import feedback.

## Why this implementation

The application already has the necessary server contracts and tenant-safe search. The highest
value work is therefore correcting the final legacy ownership assumption and making failure states
recoverable. Local filtering is appropriate for the 126-category and 12-template system catalog;
the larger product/version search continues to use the paginated API. This avoids premature search
infrastructure while preserving a future migration path.

Shared response types now describe category and template ownership with `vendorProfileId`. UI
ownership labels and allowed actions are derived from that field, while the backend remains the
authorization source of truth.

## Contracts, migration, and rollback

No database migration or endpoint is added. This stage consumes the existing category, template,
universal-search, import, and export contracts. It removes frontend use of the deleted legacy
`vendorId` response field.

Rollback is frontend-only: revert this stage to restore prior page behavior. Catalog records,
uploaded media, CSV imports, and search indexes require no rollback.

## Security and tenancy

- System-record controls are presentation safeguards; the API continues to deny their mutation.
- Organization and Vendor Profile scope come from the authenticated server session, not browser
  ownership fields.
- Search results, category/template data, imports, and exports remain scoped by backend policy.
- File extension/size checks improve feedback and do not replace server parsing or limits.

## Verification

Run from the repository root:

```powershell
npm.cmd test --workspace @inventory-system/vendor-portal
npm.cmd run build --workspace @inventory-system/vendor-portal
npm.cmd run lint --workspace @inventory-system/vendor-portal
```

Coverage includes ownership presentation, system duplication, quick-create routing, field/alias
search, load retry, safe-deletion conflicts, URL restoration, invalid search parameters, search
retry, CSV type/size rejection, row errors, import retry, and export failure/success.

## Deferred work

- Full keyboard, focus, screen-reader, mobile, contrast, and reduced-motion verification belongs
  to the next accessibility stage.
- Search engine changes are deferred until real usage data demonstrates a need.
- Inventory bulk operations and stock data do not belong to this portal release.
