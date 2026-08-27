# Vendor Portal Implementation Blueprint

**Status:** Phase 0 implemented; Vendor Portal completion approved  
**Reviewed:** 2026-08-28  
**Primary audience:** First-time producers, creators, influencers, small brands, and growing vendors  
**Repository baseline:** Next.js Vendor Portal, Express API, PostgreSQL/Prisma, Cloudflare R2

## 1. Executive summary

The immediate product goal is to finish a simple, product-first Vendor Portal. A new vendor should be able to register, choose from a ready-made taxonomy, apply a relevant product template, and create the first product without first configuring categories or templates.

The completion scope adds four capabilities to the stabilized Phase 0 foundation:

1. A floating quick-create menu with Add Product as the dominant action.
2. A searchable, seeded category and template library.
3. Sellable product versions with independent characteristics, designs, media, identifiers, and lifecycle states.
4. Universal search across products, versions, categories, and templates.

Draft, Active, and Discontinued remain explicit states for both products and versions. The Inventory Portal is strategically important but is not part of this delivery plan. Enterprise vendor functions are deferred until the small-vendor workflow has been validated.

## 2. Product principles

- Product creation comes before taxonomy administration.
- A first-time vendor should create a valid first product in under three minutes.
- Product, category, and template creation must be reachable from one consistent plus menu.
- Required fields are limited to product name and category; identifiers, media, design notes, and characteristics remain optional.
- Complexity appears progressively. Versions, custom templates, custom categories, CSV, and identifiers are available without dominating the first-use experience.
- System categories and templates are read-only. Vendors may create private records or duplicate a system template.
- Product versions model sellable editions that may coexist, not immutable edit-history snapshots.
- Every query and mutation is tenant-scoped at the API and service layers.
- PostgreSQL remains the search source of truth until measured usage justifies another service.

## 3. Completion scope

### Included

- Product list, create, view, edit, soft-delete, status filtering, media, barcode, and QR.
- Product versions with independent SKU, barcode, QR, characteristics, design notes, images, primary flag, and status.
- A 126-category system taxonomy and 12 system characteristic templates.
- Searchable category selection and automatic default-template loading.
- Floating quick-create UI for products, templates, and categories.
- Universal search command palette and full results page.
- Vendor-owned category and template management under an Advanced navigation group.
- Version-aware CSV import/export for files up to 5 MB or 1,000 rows.
- Cloudflare R2 media behavior already established in Phase 0.

### Deferred

- Inventory management portal and stock ledger.
- Immutable edit revision history.
- Product family variant matrices for size/color combinations beyond sellable versions.
- Teams, invitations, complex RBAC, SSO, SCIM, and organization switching.
- Brand verification, moderation, publication review, canonical merge workflows, and retailer adoption.
- Asynchronous spreadsheet jobs, SFTP, ERP/PIM connectors, public APIs, and webhooks.
- OpenSearch, analytics warehouse, and microservice extraction.

## 4. Current implementation baseline

Phase 0 already provides aligned portal/API contracts, cookie sessions with revocation, validated runtime configuration, tenant-scoped category writes, dedicated image/CSV middleware, Cloudflare R2 and local storage drivers, probes, request IDs, CI, repaired tests, and setup documentation.

The remaining usability gaps are concrete:

- The header plus action links directly to Add Product instead of offering a create menu.
- The mobile floating plus also links directly to Add Product.
- Product category selection is a native non-searchable select.
- The database has no system categories or system templates after migration.
- Templates are vendor-only and cannot be bound as category defaults.
- Search exists only on the product-list page and covers name and SKU.
- Product edits overwrite one row; there is no sellable version model.
- The product detail edit action is not implemented.

## 5. Target navigation and quick-create experience

### Header

Replace the prominent authentication badge with a universal-search trigger. Keep a circular plus button on the right side of the header.

### Quick-create menu

The plus button opens a shared `QuickCreateMenu`:

- Add Product is a large full-width primary action with an icon and description.
- Add Template and Add Category are smaller secondary actions below it.
- Desktop opens an anchored popup below the header button.
- Mobile keeps the fixed bottom-right plus button and opens the menu upward or as a compact bottom sheet.
- Outside click, Escape, route navigation, or action selection closes the menu.
- Focus returns to the plus button after dismissal.

Routes:

- Add Product: `/dashboard/products/new`
- Add Template: `/dashboard/templates?create=true`
- Add Category: `/dashboard/categories?create=true`

The menu must support keyboard navigation, accessible labels, focus management, and responsive layouts.

## 6. System category library

Seed exactly 126 system categories: 14 roots and eight selectable children per root. Every root includes an Other fallback. System categories use `vendorId = null`, a stable unique code, aliases, a breadcrumb path, and an optional default template.

| Root | Selectable children |
|---|---|
| Food & Beverage | Snacks; Confectionery; Bakery; Pantry & Dry Goods; Fresh & Chilled; Frozen Foods; Beverages; Other Food & Beverage |
| Clothing & Accessories | Tops; Bottoms; Dresses & One-Pieces; Outerwear; Underwear & Sleepwear; Footwear; Bags & Accessories; Other Clothing |
| Beauty & Personal Care | Skincare; Hair Care; Makeup; Fragrance; Bath & Body; Nail Care; Grooming; Other Beauty |
| Electronics | Phones & Tablets; Audio; Cameras; TVs & Displays; Smart Home; Wearables; Gaming Hardware; Other Electronics |
| Computers & Technology | Laptops & Desktops; Components; Storage; Networking; Keyboards & Mice; Printers & Scanners; Cables & Adapters; Other Technology |
| Home & Kitchen | Cookware; Tableware; Small Appliances; Furniture; Bedding & Bath; Home Decor; Cleaning Supplies; Other Home & Kitchen |
| Arts, Crafts & Handmade | Art Supplies; Craft Supplies; Sewing & Textiles; Jewelry; Ceramics; Woodwork; Stationery; Other Handmade |
| Creator Merchandise | Branded Apparel; Hats & Accessories; Prints & Posters; Stickers; Mugs & Drinkware; Books & Media; Collectibles; Other Creator Merchandise |
| Sports & Outdoors | Fitness Equipment; Outdoor Recreation; Team Sports; Cycling; Running; Camping & Hiking; Sportswear; Other Sports |
| Health & Wellness | Vitamins & Supplements; First Aid; Medical Devices; Oral Care; Personal Hygiene; Mobility & Accessibility; Wellness Products; Other Health |
| Baby, Kids & Toys | Baby Care; Feeding; Kids Clothing; Nursery; Educational Toys; Games & Puzzles; Outdoor Toys; Other Kids & Toys |
| Pet Supplies | Pet Food; Treats; Health & Grooming; Toys; Beds & Habitats; Collars & Leashes; Aquatic Supplies; Other Pet Supplies |
| Automotive | Parts; Tools & Equipment; Car Care; Oils & Fluids; Vehicle Electronics; Interior Accessories; Exterior Accessories; Other Automotive |
| Office & Business Supplies | Office Supplies; Paper & Packaging; Office Furniture; Point of Sale; Safety Equipment; Industrial Consumables; Shipping Supplies; Other Business Supplies |

### Searchable selection

`SearchableCategorySelect` searches name, root, breadcrumb, stable code, and aliases. Roots are group headings; only leaf categories are selectable. The same component is used for product create/edit, product filters, and CSV mapping.

Selecting a category loads its default template. If the user already entered characteristic values, category changes require a Keep Existing or Replace With Template decision.

## 7. System template library

Seed 12 read-only templates:

- Generic Physical Product
- Packaged Food
- Beverage
- Apparel
- Footwear
- Beauty & Personal Care
- Consumer Electronics
- Computers & Technology
- Home & Kitchen
- Handmade & Creator Merchandise
- Health & Wellness
- Pet Product

Each template provides five to eight common optional fields using the existing JSON field representation. Vendors may duplicate a system template into an editable custom template. Categories without a specialized match use Generic Physical Product.

The first release deliberately defers versioned template schemas, conditional validation, required-field publication rules, and template migration tooling.

## 8. Product and version lifecycle

### Product status

Products retain exactly three states:

- `DRAFT`
- `ACTIVE`
- `DISCONTINUED`

The product editor always displays the status selector and defaults to Draft. Lists, dashboard totals, filters, CSV, and universal search use the same enum values.

### Sellable versions

A `Product` is the shared identity: vendor, base name, category, product status, and lifecycle timestamps. A `ProductVersion` represents a sellable edition such as Original, Formula V2, 2026 Edition, or Packaging Redesign.

Each version owns:

- Monotonic version number and human-readable label.
- Vendor-unique SKU.
- Barcode and QR target.
- Draft, Active, or Discontinued status.
- Characteristics and design notes.
- Images and primary-version flag.
- Lifecycle timestamps and soft deletion.

Effective availability requires both the product and version to be Active. Activating a product requires at least one active version. Changing product status does not silently rewrite version statuses.

Product creation creates the parent product and one Original primary version in one transaction. SKU is optional; the API generates `PRD-{8 uppercase characters}` when omitted.

### Version actions

- Start Blank creates an empty new version.
- Copy Existing copies characteristics, design notes, and image associations without duplicating R2 objects.
- Set Primary changes the version presented in product lists and summaries.
- Discontinue and Reactivate preserve history.
- The only remaining version cannot be deleted.
- A primary version cannot be deleted until another primary version is selected.

The product page shows version cards, primary status, SKU, version status, version comparison, and version actions.

## 9. Universal search

Universal search covers products, product versions, categories, and templates.

### User experience

- Desktop shows a search trigger in the header.
- Mobile shows a search icon.
- `Ctrl+K` and `Cmd+K` open the command palette.
- Search begins at two characters and is debounced by 200 ms.
- The palette shows up to five results per Products, Categories, and Templates group.
- View All opens `/dashboard/search?q=...` with type filters and pagination.
- Version matches appear under Products and deep-link to the matching version.

### Search fields and ranking

- Products: name, product status, primary SKU/barcode, version label, version SKU/barcode, characteristic names, and characteristic values.
- Categories: name, root, breadcrumb, code, and aliases.
- Templates: template name and field names.
- Exact SKU/barcode matches rank first, exact names second, prefixes third, and fuzzy matches last.

Search is authenticated and tenant-scoped. Product results are vendor-private. Categories and templates include system records plus the current vendor's records.

PostgreSQL normalized `searchText` fields and `pg_trgm` indexes provide initial search. Query length is capped at 100 characters and the route uses the existing rate-limit infrastructure.

## 10. Public API and type changes

### Category options

`GET /api/v1/categories/options`

```ts
interface CategoryOption {
  id: string;
  code: string;
  name: string;
  path: string;
  aliases: string[];
  parentId: string;
  defaultTemplateId: string | null;
  source: 'SYSTEM' | 'VENDOR';
}
```

### Product versions

- `GET /api/v1/products/:productId/versions`
- `POST /api/v1/products/:productId/versions`
- `GET /api/v1/products/:productId/versions/:versionId`
- `PUT /api/v1/products/:productId/versions/:versionId`
- `DELETE /api/v1/products/:productId/versions/:versionId`
- `POST /api/v1/products/:productId/versions/:versionId/set-primary`

Product list responses include `primaryVersion` and `versionCount`. Product creation accepts parent-product data plus an initial-version payload.

### Universal search

- `GET /api/v1/search?q=&types=PRODUCT,CATEGORY,TEMPLATE&limitPerType=5`
- `GET /api/v1/search?q=&type=PRODUCT&page=1&limit=20`

```ts
type SearchResultType = 'PRODUCT' | 'CATEGORY' | 'TEMPLATE';

interface UniversalSearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status?: ProductStatus;
  imageUrl?: string | null;
  versionId?: string;
  matchedOn?: string;
}
```

## 11. CSV completion scope

- Accept category code or unambiguous category name instead of internal UUIDs.
- Include product name, version label, product status, version status, SKU, barcode, characteristics, and primary flag.
- Enforce the three lifecycle states independently for products and versions.
- Limit imports to 5 MB and 1,000 rows.
- Return stable row-level errors for category, identifier, status, ownership, and characteristic failures.
- Export primary and secondary versions.
- Keep processing synchronous for this small-vendor release.

## 12. Ordered implementation roadmap

Every stage uses a `codex/` feature branch and produces a merge request targeting `develop`. Branches are stacked and must merge in numerical order.

### Stage 00 - roadmap and contracts

Branch: `codex/vendor-00-roadmap-contracts`

- Replace the active enterprise/inventory roadmap with this Vendor Portal completion plan.
- Lock lifecycle, search, seed, API, migration, test, and rollback contracts.
- Regenerate, sanitize, render, and visually verify the Google Docs-ready document.

### Stage 01 - data foundation

Branch: `codex/vendor-01-data-foundation`

- Add category codes, aliases, template defaults, system template ownership, ProductVersion, version-owned media, search text, and trigram indexes.
- Apply an additive migration, backfill existing products into Original versions, validate data, then enforce required relations.

### Stage 02 - system catalog seeds

Branch: `codex/vendor-02-system-catalog-seeds`

- Add the 126 categories, 12 templates, mappings, upserts, repeatable seed command, and idempotency tests.

### Stage 03 - quick-create and category UI

Branch: `codex/vendor-03-quick-create-category-ui`

- Add accessible menu/combobox primitives, the desktop and mobile quick-create menu, searchable category selection, and create-query routing.

### Stage 04 - product editor and states

Branch: `codex/vendor-04-product-editor-status`

- Add the product-plus-initial-version form, visible status selectors, generated SKU, template application, optional details, and updated product cards.

### Stage 05 - product version workflows

Branch: `codex/vendor-05-product-versions`

- Add version APIs, Start Blank, Copy Existing, primary selection, edit, compare, discontinue/reactivate, guarded deletion, and tenancy tests.

### Stage 06 - universal search API

Branch: `codex/vendor-06-universal-search-api`

- Add query validation, ranking, grouped results, pagination, tenancy, rate limits, and performance tests.

### Stage 07 - universal search UI

Branch: `codex/vendor-07-universal-search-ui`

- Add the header palette, keyboard shortcut, grouped results, request cancellation, full search page, URL state, deep links, and mobile behavior.

### Stage 08 - category/template management

Branch: `codex/vendor-08-category-template-management`

- Move management under Advanced, separate system/vendor records, duplicate templates, display usage, add search, and enforce safe deletion.

### Stage 09 - CSV compatibility

Branch: `codex/vendor-09-csv-version-compatibility`

- Add category resolution, version columns, status validation, limits, row errors, version exports, and API/Postman updates.

### Stage 10 - release hardening

Branch: `codex/vendor-10-release-hardening`

Scope: Remove transitional fields, run full migration/browser/security/accessibility/R2/search checks, benchmark 10,000 products, and finalize documentation.

## 13. Test and release gates

### Required behavior tests

- A first-time vendor can create a product without visiting Categories or Templates.
- Quick Create works by mouse, touch, and keyboard on desktop and mobile.
- Product and version status support Draft, Active, and Discontinued.
- Existing products migrate without losing identifiers, characteristics, QR data, or images.
- Version SKUs are tenant-unique and primary-version changes are concurrency-safe.
- System seeds are idempotent and never mutate vendor-owned data.
- Category search works by name, root, path, code, and alias.
- Universal search ranks exact identifiers first and never crosses tenant boundaries.
- CSV uses the same category, version, identifier, and status rules as the UI.

### Required checks

```powershell
npm.cmd ci
npm.cmd run generate --workspace @inventory-system/database
npx.cmd prisma migrate status --schema packages/database/prisma/schema.prisma
npm.cmd run build
npm.cmd test
npm.cmd run lint
npm.cmd audit --omit=dev --audit-level=high
```

The release gate also includes migration tests from the pre-version schema, R2 media regression tests, accessible keyboard/screen-reader checks, browser flows, seed repetition, and universal-search benchmarking.

## 14. Success measures

- Median time from registration to first product under three minutes.
- Percentage of new vendors who create a product before visiting Advanced settings.
- Category searches ending in a selection and zero-result rate.
- Template application and completion rates.
- Product/version workflow completion and error rate.
- Universal-search latency, zero-result rate, and selected-result rate.
- CSV accepted-row rate and correction rate.
- Zero cross-tenant authorization failures in automated adversarial tests.

## 15. Merge-request standard

Every merge request includes:

- Summary and user-visible behavior.
- Technical implementation and public contract changes.
- Migration and rollback notes where applicable.
- Security and tenancy considerations.
- Commands executed and results.
- Screenshots for visible UI changes.
- Dependency merge request and deferred work.

No feature branch merges automatically. Merge requests target `develop` and merge strictly in stage order after review and passing checks.

## 16. Recommended decision

Complete Stages 00 through 10, pilot the Vendor Portal with small vendors, and measure first-product completion, category search, templates, versions, universal search, and CSV. Do not reopen inventory or enterprise vendor scope until the completion release is stable and the small-vendor workflow has real usage evidence.
