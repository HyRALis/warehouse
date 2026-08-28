# Vendor Stage 09 — Version-aware CSV contract

The CSV format is synchronous and optimized for small-vendor corrections. Files are limited to 5 MB and 1,000 data rows. One row represents one sellable product version.

## Columns

| Column | Required | Behavior |
| --- | --- | --- |
| `productReference` | For multi-version products | File-local grouping key. Reuse the same value for every version of a product. When omitted, normalized `productName` is used. |
| `productName` | Yes | Shared display name for the grouped product. |
| `categoryCode` | Recommended | Stable system category code. |
| `categoryName` | When code is omitted | Accepted only when it resolves to exactly one system/vendor category. |
| `productStatus` | No | `DRAFT`, `ACTIVE`, or `DISCONTINUED`; defaults to `DRAFT`. |
| `versionLabel` | No | Human label; defaults to `Original`. |
| `versionStatus` | No | Independent lifecycle state; defaults to `DRAFT`. |
| `sku` | Yes | Vendor-wide unique version SKU. The primary version remains mirrored into the transitional product SKU field. |
| `barcode` | No | Vendor-wide unique version barcode. |
| `characteristics` | No | JSON array using the same characteristic objects as the editor. |
| `designNotes` | No | Version-specific design or production notes. |
| `isPrimary` | No | `true`/`false`, `yes`/`no`, or `1`/`0`. The first row is primary when none is selected. |

The compatibility window also accepts `baseName`, `categoryId`, and `status` from the pre-version CSV. They map to `productName`, an authorized category, and `productStatus`. This compatibility is intentionally transitional and is removed only after existing integrations migrate.

## Atomic grouping and corrections

All rows sharing a product reference are validated and written as one product transaction. If one version row is invalid, that product is skipped; unrelated valid products still import. The response reports imported products, imported versions, unique failed rows, and structured errors with `row`, `code`, `field`, `value`, and `message`.

Stable row error codes include:

- `REQUIRED_FIELD`
- `CATEGORY_NOT_AVAILABLE`
- `CATEGORY_AMBIGUOUS`
- `INVALID_PRODUCT_STATUS`
- `INVALID_VERSION_STATUS`
- `INVALID_CHARACTERISTICS`
- `INVALID_PRIMARY_FLAG`
- `MULTIPLE_PRIMARY_VERSIONS`
- `PRODUCT_CONFLICT`
- `IDENTIFIER_CONFLICT`
- `IMPORT_FAILED`

## Export

Export emits every non-deleted primary and secondary version using the same columns. Product and version lifecycle states remain separate, and category UUIDs are not required for a round trip.

## Verification

```powershell
npm.cmd test --workspace @inventory-system/api -- --runInBand tests/bulk.test.ts
npm.cmd test --workspace @inventory-system/vendor-portal -- src/app/dashboard/bulk/page.test.tsx
```

Results on 2026-08-28:

- Full API suite: 9 suites, 48 tests passed.
- Full vendor portal suite: 9 files, 27 tests passed.
- Full monorepo build passed.
- Lint passed with 0 errors and 7 pre-existing Next.js warnings.
- The Postman collection parses as valid collection v2.1 JSON.
