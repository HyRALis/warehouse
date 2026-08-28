# Vendor Stage 08 — Category and Template Management

## User-visible behavior

- Keeps inventory and product creation as the primary navigation group while moving category, template, and CSV tools under **Advanced setup**.
- Presents the 126 built-in categories and 12 built-in templates as read-only system records.
- Supports searchable category and template lists, including category aliases and template field names.
- Shows category breadcrumbs, default templates, product usage, and subcategory usage.
- Allows vendor-owned category and template creation, editing, and safe deletion.
- Duplicates a built-in template into an editable vendor-owned copy.
- Opens category and template creation from the quick-create menu with `?create=true`.
- Replaces the fixed mobile sidebar with an accessible mobile navigation drawer.

## API and tenancy

- Category writes may reference only system records or records available to the authenticated vendor.
- System and other-vendor records return `403` for mutation attempts.
- Categories with products or children return `409 CATEGORY_IN_USE` on deletion.
- Templates used as category defaults return `409 TEMPLATE_IN_USE` on deletion.
- `POST /api/v1/templates/:id/duplicate` accepts only a system template and creates a vendor-owned copy without changing the source.

## Verification

```powershell
npm.cmd test --workspace @inventory-system/api -- --runInBand
npm.cmd test --workspace @inventory-system/vendor-portal
npm.cmd run build
npm.cmd run lint
```

Results on 2026-08-28:

- API: 9 suites, 40 tests passed.
- Vendor portal: 8 files, 24 tests passed.
- Full monorepo build passed.
- Lint passed with 0 errors and 7 pre-existing Next.js warnings.
- Authenticated desktop checks passed for category CRUD, template duplication, ownership controls, search metadata, and quick-create entry points.
- A 390 × 844 viewport check confirmed the workspace retains the full viewport width, the desktop sidebar is hidden, and the mobile drawer closes with Escape.
- Browser-created category and template fixtures were removed after verification.

## Screenshots

- `docs/screenshots/vendor-08-category-management.png`
- `docs/screenshots/vendor-08-template-management.png`
- `docs/screenshots/vendor-08-mobile-navigation.png`
