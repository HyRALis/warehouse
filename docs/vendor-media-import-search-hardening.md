# Vendor media, import, export, and search hardening

## Purpose

This stage hardens the Vendor Portal's highest-risk data boundaries before legacy authentication
and ownership fields are removed. It keeps the existing product workflows and contracts while
making image storage, bulk CSV processing, and universal search safer and more predictable for an
active Organization and its primary Vendor Profile. It does not add Inventory Portal behavior.

## R2 and image lifecycle

JPEG, PNG, and WebP uploads are accepted only when both the declared MIME type and the file's magic
bytes agree. Images stored in Cloudflare R2 use generated UUID keys beneath `products/`, retain the
correct content type, render inline, and receive immutable public-cache metadata. Development-local
storage uses the same generated filename policy.

Deletion accepts only a generated image key from the configured public R2 origin and path, or from
the configured local API `/uploads/` origin. Foreign origins, unexpected paths, traversal attempts,
and arbitrary keys are rejected. This prevents a stored or client-supplied URL from becoming a way
to delete an unrelated R2 object or local file.

Every uploaded product image belongs to a Product Version. The legacy product-image endpoint targets
the primary version, applies the four-image-per-version limit, and updates the Product's representative
image in the same database transaction. If the external upload succeeds but the database write fails,
the controller compensates by deleting the new object. Removing an image deletes its R2 object only
when no other image record references that URL, preserving copied-version image references.

## CSV boundaries

Import retains the existing 5 MB and 1,000-row limits and reports validation problems per row. It
also rejects oversized product names, references, category values, version labels, SKUs, barcodes,
design notes, and characteristic arrays with the `FIELD_TOO_LONG` code. Characteristics must be a
JSON array with no more than 100 entries. Valid rows remain scoped to categories visible to the
active Vendor Profile and use the existing product/version uniqueness and lifecycle rules.

CSV export neutralizes values beginning with `=`, `+`, `-`, `@`, tab, or carriage return by adding
an apostrophe. This prevents names, codes, labels, identifiers, and design notes from executing as
spreadsheet formulas when a vendor opens the export. Product and version statuses remain separate,
and primary and secondary versions retain their version-aware columns.

## Search isolation and practical ranking

Product, version, category-parent, and template joins now prove that every joined custom record
belongs to the active Vendor Profile; system categories and templates remain available. Invalid
type-filter segments are rejected instead of being silently ignored.

Search first probes for indexed literal matches. When any literal match exists, only literal
candidates are ranked; PostgreSQL trigram matching is used only as a typo-recovery fallback. Exact
SKU and barcode ranking remains unchanged. This prevents a family of similar SKUs from flooding an
exact lookup with fuzzy candidates while retaining user-friendly misspelling support. Product name
or category changes refresh every version's search projection, not only the primary version.

## Search benchmark

Run the manual benchmark only against a development or disposable PostgreSQL database:

```sh
npm run benchmark:search --workspace @inventory-system/database
```

The script requires one existing Vendor Profile and an accessible category. It inserts 10,000
uniquely marked temporary products plus 10,000 primary versions, refreshes PostgreSQL statistics,
runs 2 warmups and 15 measured iterations for each scenario, and deletes exactly the current run's
marked products in `finally`. Product deletion cascades to the temporary versions. The compatibility
ownership triggers are disabled only inside the corpus-loading transaction because both verified
ownership keys are supplied directly; they are re-enabled before the transaction commits.

The development baseline recorded on 2026-09-02 was:

| Scenario                   | Matches |         p50 |         p95 |   Budget |
| -------------------------- | ------: | ----------: | ----------: | -------: |
| Exact version SKU          |       1 |    38.20 ms |    40.82 ms |   250 ms |
| Fuzzy typo recovery        |       1 |   810.42 ms |   849.43 ms | 1,250 ms |
| Broad product/version text |  20,000 | 1,095.52 ms | 1,119.69 ms | 1,500 ms |

The environment variables `SEARCH_BENCHMARK_EXACT_P95_MS`,
`SEARCH_BENCHMARK_FUZZY_P95_MS`, and `SEARCH_BENCHMARK_BROAD_P95_MS` may tighten the
development budgets. This is a repeatable guardrail, not a production capacity claim; production
hardware, network latency, and real data distributions must be measured separately before launch.

## Verification

Automated coverage verifies image signatures and metadata, trusted deletion origins, primary-version
ownership, upload compensation, shared-reference deletion, CSV limits and spreadsheet safety,
profile-aware joins, filter validation, exact ranking context, and fuzzy fallback selection. The
benchmark verifies cleanup as part of every successful or failed run.

No database migration is introduced by this stage. TypeScript, the focused API suite, complete API
and monorepo tests, builds, lint, and the high-severity production dependency audit are required
before the pull request is opened.

## Rollback

Reverting this application-only stage restores the previous storage, CSV, and search behavior. No
schema rollback is needed. Objects already written with PNG extensions or immutable cache metadata
remain valid. Preserve database image rows when rolling back so referenced R2 objects are not
orphaned, and do not bulk-delete shared image URLs.

## Deferred work

CDN image transformations, malware scanning, private signed media, background CSV jobs, external
search services, new search indexes, and production load testing are deliberately deferred. Legacy
authentication and ownership fields are removed in the next backend stage.
