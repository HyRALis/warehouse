# Vendor Portal Implementation Blueprint

**Status:** Product roadmap stages 00-09 merged; final platform and release completion approved\
**Reviewed:** 2026-09-06\
**Primary audience:** First-time producers, creators, influencers, small brands, and growing vendors\
**Repository baseline:** Next.js Vendor Portal, Express API, PostgreSQL/Prisma, Cloudflare R2

## 1. Executive summary

The immediate product goal is to finish a simple, product-first Vendor Portal on a platform foundation that can support additional subscribed portals later. A new vendor should be able to register, create an organization and vendor profile, choose from a ready-made taxonomy, apply a relevant product template, and create the first product without first configuring categories or templates.

Product roadmap stages 00 through 09 have delivered four core capabilities on the stabilized Phase 0 foundation:

1. A floating quick-create menu with Add Product as the dominant action.
2. A searchable, seeded category and template library.
3. Sellable product versions with independent characteristics, designs, media, identifiers, and lifecycle states.
4. Universal search across products, versions, categories, and templates.

The remaining release scope upgrades Prisma 5 to Prisma 7, replaces the handwritten authentication system with Better Auth, separates users and organizations from the vendor profile, adds organization-owned portal subscriptions and member portal access, and completes release hardening. Draft, Active, and Discontinued remain explicit states for both products and versions.

The Inventory Portal is strategically important but is not part of this implementation run. It will begin in a separate chat only after this Vendor Portal release is complete.

## 2. Product principles

- Product creation comes before taxonomy administration.
- A first-time vendor should create a valid first product in under three minutes.
- Product, category, and template creation must be reachable from one consistent plus menu.
- Required fields are limited to product name and category; identifiers, media, design notes, and characteristics remain optional.
- Complexity appears progressively. Versions, custom templates, custom categories, CSV, and identifiers are available without dominating the first-use experience.
- System categories and templates are read-only. Vendors may create private records or duplicate a system template.
- Product versions model sellable editions that may coexist, not immutable edit-history snapshots.
- Every query and mutation is tenant-scoped at the API and service layers.
- A User, Organization, portal subscription, and Vendor Profile are separate domain concepts.
- Organizations own portal subscriptions; Vendor Profiles own vendor catalog data.
- Owners may invite members and grant or revoke Vendor Portal access.
- Authentication and tenancy migrations are additive and verified before transitional fields are removed.
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
- Prisma 7 with the PostgreSQL driver adapter and an explicit generated client.
- Better Auth email/password authentication, verification, reset, MFA, recovery codes, and revocable sessions.
- Organizations, Owner and Member memberships, invitations, Vendor Portal subscriptions, and per-member Vendor Portal access.
- A primary Vendor Profile that is distinct from the Organization and owns products, versions, categories, templates, media, and import/export activity.

### Deferred

- Inventory management portal and stock ledger.
- Immutable edit revision history.
- Product family variant matrices for size/color combinations beyond sellable versions.
- Custom job roles, granular inventory permissions, SSO, SCIM, and enterprise directory synchronization.
- Subscription billing, plans, checkout, invoices, taxation, and payment-provider webhooks.
- Multiple active Vendor Profiles per Organization and profile-switching UI.
- Brand verification, moderation, publication review, canonical merge workflows, and retailer adoption.
- Asynchronous spreadsheet jobs, SFTP, ERP/PIM connectors, public APIs, and webhooks.
- OpenSearch, analytics warehouse, and microservice extraction.

## 4. Current implementation baseline

Phase 0 already provides aligned portal/API contracts, cookie sessions with revocation, validated runtime configuration, tenant-scoped category writes, dedicated image/CSV middleware, Cloudflare R2 and local storage drivers, probes, request IDs, CI, repaired tests, and setup documentation. Product roadmap stages 00 through 09 are merged on the remote `develop` branch.

The remote `develop` branch is the authoritative implementation base for this release. Work from `main` is intentionally excluded for now and may be evaluated separately after the Vendor Portal release. The unfinished Stage 10 worktree is preserved as evidence but is not treated as completed release work.

The remaining platform and release gaps are concrete:

- Prisma 5 uses the pre-Prisma-7 client and datasource configuration.
- The Vendor record still combines a person, authentication credentials, tenant identity, and producer profile.
- The handwritten authentication implementation does not provide organization membership, invitations, MFA, or portal entitlements.
- Catalog ownership is expressed as `vendorId` instead of the explicit Vendor Profile boundary.
- Stage 10 migration, R2, search, browser, accessibility, and release evidence is incomplete.

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

| Root                       | Selectable children                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Food & Beverage            | Snacks; Confectionery; Bakery; Pantry & Dry Goods; Fresh & Chilled; Frozen Foods; Beverages; Other Food & Beverage                                        |
| Clothing & Accessories     | Tops; Bottoms; Dresses & One-Pieces; Outerwear; Underwear & Sleepwear; Footwear; Bags & Accessories; Other Clothing                                       |
| Beauty & Personal Care     | Skincare; Hair Care; Makeup; Fragrance; Bath & Body; Nail Care; Grooming; Other Beauty                                                                    |
| Electronics                | Phones & Tablets; Audio; Cameras; TVs & Displays; Smart Home; Wearables; Gaming Hardware; Other Electronics                                               |
| Computers & Technology     | Laptops & Desktops; Components; Storage; Networking; Keyboards & Mice; Printers & Scanners; Cables & Adapters; Other Technology                           |
| Home & Kitchen             | Cookware; Tableware; Small Appliances; Furniture; Bedding & Bath; Home Decor; Cleaning Supplies; Other Home & Kitchen                                     |
| Arts, Crafts & Handmade    | Art Supplies; Craft Supplies; Sewing & Textiles; Jewelry; Ceramics; Woodwork; Stationery; Other Handmade                                                  |
| Creator Merchandise        | Branded Apparel; Hats & Accessories; Prints & Posters; Stickers; Mugs & Drinkware; Books & Media; Collectibles; Other Creator Merchandise                 |
| Sports & Outdoors          | Fitness Equipment; Outdoor Recreation; Team Sports; Cycling; Running; Camping & Hiking; Sportswear; Other Sports                                          |
| Health & Wellness          | Vitamins & Supplements; First Aid; Medical Devices; Oral Care; Personal Hygiene; Mobility & Accessibility; Wellness Products; Other Health                |
| Baby, Kids & Toys          | Baby Care; Feeding; Kids Clothing; Nursery; Educational Toys; Games & Puzzles; Outdoor Toys; Other Kids & Toys                                            |
| Pet Supplies               | Pet Food; Treats; Health & Grooming; Toys; Beds & Habitats; Collars & Leashes; Aquatic Supplies; Other Pet Supplies                                       |
| Automotive                 | Parts; Tools & Equipment; Car Care; Oils & Fluids; Vehicle Electronics; Interior Accessories; Exterior Accessories; Other Automotive                      |
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

## 12. Platform identity and subscription model

### Domain relationships

```text
User
  -> OrganizationMembership
       -> Organization
            -> OrganizationPortalSubscription
            -> MemberPortalAccess
            -> VendorProfile
                 -> Products, versions, categories, templates, media, imports and exports
```

A User is a person. An Organization owns subscriptions to application portals. A membership connects the User to the Organization. A portal subscription enables the Organization to use a portal. Member Portal Access enables a non-owner member to enter that subscribed portal. A Vendor Profile is the producer identity and owns Vendor Portal data; it is not the Organization itself.

Registration creates a User, Organization, Owner membership, active Vendor Portal subscription, Owner access, and primary Vendor Profile in one transaction. Owners implicitly access every active subscription their Organization owns. Invited members require explicit Vendor Portal access. The last Owner cannot be removed, demoted, or locked out.

The first release seeds only the stable `vendor` portal key. Subscription status is `ACTIVE`, `SUSPENDED`, or `CANCELLED`, with start and optional end dates. Subscription records are entitlements rather than billing records. Plans, checkout, invoices, taxes, renewals, and payment-provider webhooks are deferred.

The schema permits future Vendor Profile keys, but this release accepts only `primary`. The database enforces uniqueness of `organizationId + profileKey`, and the service rejects a second primary profile or any other profile key. Later one-to-many support can add profile keys and profile-specific access without redesigning Organization ownership.

### Authorization context

Every vendor request resolves an authorization context containing User, Organization membership, active portal subscription, member portal access, and primary Vendor Profile. Catalog queries and mutations scope by `vendorProfileId`. An authenticated user without an active membership, active subscription, Owner status or explicit access, or access to the resolved profile is denied before domain work begins.

## 13. Prisma 7 and authentication migration

Prisma 7 is upgraded before Better Auth tables are added. The database package adopts Node 22 ESM, `prisma.config.ts`, an explicit generated-client output, `@prisma/adapter-pg`, explicit environment loading, one shared client, explicit pool timeouts, graceful shutdown, and an explicit seed command.

The existing Vendor row is split additively:

1. Email, verification state, and credentials create Better Auth User and Account records.
2. Company identity creates the Organization and Owner membership.
3. The Organization receives an active Vendor Portal subscription and Owner access.
4. The existing Vendor identifier is preserved where practical as the primary Vendor Profile identifier.
5. Products, versions, custom categories, custom templates, media, and imports move from `vendorId` to `vendorProfileId`.
6. System categories and templates retain nullable profile ownership.
7. Reads and writes switch to the new context before transitional fields are removed.

Existing accounts keep their passwords. The cutover revokes legacy sessions and requires a new login. On first successful login, the compatibility verifier validates the existing bcrypt hash and replaces it with the new password hash. Unused legacy reset tokens are invalidated. A temporary `/api/v1/auth` facade keeps the current frontend working while backend-first PRs merge; it is removed after the new frontend authentication flow is live.

## 14. Ordered completion roadmap

Every stage uses a `codex/` branch and produces a pull request targeting `develop`. Backend capabilities merge before their dependent frontend work. Pull requests are opened only after their scoped verification passes, are not merged automatically, and merge in numerical order.

| Order | Branch                                           | Pull request                                                              | Purpose                                                                                                                         |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 00    | `codex/docs-vendor-completion-roadmap`           | `docs(vendor): define final Prisma and identity completion roadmap`       | Make this document and the decision log the authoritative completion contract.                                                  |
| 01    | `codex/backend-vendor-prisma-7`                  | `chore(database): upgrade vendor platform to Prisma 7`                    | Modernize persistence independently before adding authentication models.                                                        |
| 02    | `codex/backend-vendor-better-auth`               | `feat(auth): add Better Auth users, organizations, and secure sessions`   | Separate people and organizations and provide verified, revocable, MFA-capable authentication.                                  |
| 03    | `codex/backend-vendor-entitlements`              | `feat(platform): add portal subscriptions and vendor-profile tenancy`     | Separate portal entitlement from producer identity and migrate catalog ownership safely.                                        |
| 04    | `codex/frontend-vendor-auth`                     | `feat(portal): migrate vendor authentication and organization onboarding` | Move registration, login, verification, reset, MFA, sessions, and active Organization context to the accepted backend contract. |
| 05    | `codex/frontend-vendor-member-access`            | `feat(portal): add member invitations and vendor portal access`           | Let an Owner invite members and control access without introducing future inventory roles.                                      |
| 06    | `codex/backend-vendor-catalog-hardening`         | `chore(vendor): harden catalog tenancy and product lifecycle APIs`        | Complete Vendor Profile authorization and product/version invariants.                                                           |
| 07    | `codex/backend-vendor-media-import-search`       | `chore(vendor): harden R2 media, imports, exports, and search`            | Verify the highest-risk external and bulk-data boundaries before release.                                                       |
| 08    | `codex/backend-vendor-auth-cleanup`              | `refactor(auth): remove transitional vendor authentication fields`        | Remove legacy authentication and ownership only after the cutover is proven.                                                    |
| 09    | `codex/frontend-vendor-product-hardening`        | `chore(portal): harden product and version workflows`                     | Finish product-first flows against the new Organization and Vendor Profile context.                                             |
| 10    | `codex/frontend-vendor-catalog-search-hardening` | `chore(portal): harden catalog, search, and import workflows`             | Complete advanced catalog and bulk workflows without expanding scope.                                                           |
| 11    | `codex/frontend-vendor-accessibility`            | `chore(portal): complete vendor accessibility and responsive behavior`    | Make the finished workflows usable by keyboard, screen reader, desktop, and mobile users.                                       |
| 12    | `codex/release-vendor-portal`                    | `chore(vendor): verify and document vendor portal release`                | Produce release evidence and documentation without adding business features.                                                    |

### Stage details

PR 01 upgrades Prisma without changing user-visible behavior. It verifies clean and current-data migrations, generation, seeding, API tests, pooling, and shutdown behavior.

PR 02 adds Better Auth's User, Account, Session, Verification, Organization, Member, and Invitation data, email/password flows, verification, reset, TOTP, recovery codes, session revocation, legacy-password migration, and the temporary compatibility facade.

PR 03 adds Portal, Organization Portal Subscription, Member Portal Access, primary Vendor Profile, subscription/access middleware, catalog ownership backfill, one-primary-profile enforcement, and migration verification reports.

PRs 04 and 05 separately deliver the visible authentication/onboarding and member-access experiences. The Organization switcher appears only when a User has multiple memberships. Custom job roles remain deferred.

PR 06 completes profile-scoped authorization across products, versions, categories, templates, and lifecycle actions, including system-record immutability, identifier uniqueness, and primary-version concurrency.

PR 07 completes R2 upload/deletion/rollback tests, version-owned media behavior, CSV limits and row errors, profile-aware import/export, and universal-search isolation and the 10,000-product benchmark.

PR 08 removes handwritten JWT/session code, the former Vendor data, compatibility triggers, and
transitional ownership columns after the migration audits pass. The established `/api/v1/auth`
URLs remain temporarily as thin Better Auth-backed routes while the stacked frontend branch still
uses them; they no longer read or write a legacy credential or session system.

PRs 09 through 11 finish the quick-create, product/version, catalog/template, universal-search, CSV, mobile, keyboard, focus, screen-reader, and responsive behavior already defined in this blueprint.

PR 12 contains only clean-install and upgrade verification, release notes, security and license evidence, setup/migration/rollback documentation, final screenshots, and regenerated Markdown/DOCX artifacts.

### Review correction checkpoint — 2026-09-06

PRs #16–#22 have been reconciled with develop and passed CI; they remain unmerged. The separate
backend review-corrections branch, dependent on #19, adds database-enforced last-owner protection
and tenant-scoped shared-taxonomy counts. See [the review checkpoint](vendor-review-2026-09-06.md)
for exact verification results, migration/rollback notes and remaining identity, media, frontend,
dependency and release-documentation gates. Passing these scoped checks is not release approval.

## 15. Test and release gates

### Identity and tenancy

- Existing users sign in with their existing password after legacy sessions are revoked, and the stored hash upgrades after successful authentication.
- New registration creates the complete User, Organization, Owner, subscription, access, and primary Vendor Profile graph atomically.
- Owners can invite, resend, revoke, and remove members without removing the last Owner.
- Suspended or cancelled subscriptions block portal access.
- Non-owner members without Vendor Portal access are denied.
- Direct cross-Organization and cross-Profile requests are denied.
- Concurrent onboarding cannot create two primary Vendor Profiles.
- Verification, password reset, MFA recovery, trusted sessions, and session revocation are covered.

### Vendor behavior

- A first-time vendor creates a product without visiting Categories or Templates.
- Quick Create works by mouse, touch, and keyboard on desktop and mobile.
- Product and version status support Draft, Active, and Discontinued.
- Existing products migrate without losing identifiers, characteristics, QR data, or images.
- Version SKUs are profile-unique and primary-version changes are concurrency-safe.
- System seeds are idempotent and never mutate profile-owned data.
- Universal search ranks exact identifiers first and never crosses Organization or Profile boundaries.
- CSV uses the same category, version, identifier, status, and authorization rules as the UI.
- R2 cleanup never deletes an object that another image association still references.

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

The release gate also includes migration from the pre-Better-Auth schema, clean-database migration, seed repetition, R2 regression tests, keyboard and screen-reader browser flows, universal-search benchmarking, Markdown/DOCX content parity, title sanitization, accessibility audit, and visual inspection of every rendered DOCX page.

## 16. Success measures

- Median time from registration to first product under three minutes.
- Successful migration rate for existing users, passwords, and catalog records.
- Invitation acceptance and Vendor Portal access success rate.
- Zero cross-Organization or cross-Profile authorization failures in adversarial tests.
- Product/version workflow completion and error rate.
- Universal-search latency, zero-result rate, and selected-result rate.
- CSV accepted-row rate and correction rate.
- Zero unresolved high-severity release, security, migration, or accessibility failures.

## 17. Pull-request standard

Every pull request includes Summary, Problem, Why Now, Selected Approach, Included and Excluded Scope, User-visible Behavior, Technical Implementation, Public Contract Changes, Migration and Rollback, Security and Tenancy, Verification Results, screenshots where visible, Dependency PR, Documentation Updates, and Deferred Work.

Backend pull requests do not contain pages or feature UI. Frontend pull requests do not add migrations or backend rules. If a frontend implementation reveals a missing contract, a focused backend follow-up merges first. The PR description explains the current delta and links to this canonical blueprint instead of repeating the entire roadmap.

## 18. Release boundary and inventory handoff

This implementation run ends when PR 12 is merged and the repository is release-ready. It does not provision an external staging or production deployment.

After the vendor release, create `docs/inventory-portal-handoff.md` containing only the reusable User/Organization model, membership and portal-access rules, subscription service, Vendor Profile separation, Prisma 7 conventions, Better Auth context, shared UI/contracts, and explicitly deferred role decisions. Then begin Inventory Portal planning and implementation in a separate Codex chat from the completed `develop` state.
