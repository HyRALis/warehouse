# Vendor accessibility and responsive hardening

## Purpose

This stage makes the completed Vendor Portal workflows operable with a keyboard, understandable to
assistive technology, and stable at desktop and mobile viewport sizes. It changes interaction and
presentation only; it does not add business features or claim formal accessibility certification.

## User-visible behavior

- A skip link lets keyboard users move directly to the current page content.
- Desktop and mobile navigation identify the current page with semantic `aria-current` state.
- The icon-only desktop logout button now has an accessible name.
- Mobile navigation traps focus while open, closes with Escape or the backdrop, restores focus to
  its trigger, and preserves the body's previous scroll state.
- The mobile quick-create sheet keeps Tab and Shift+Tab focus within its trigger and actions.
- Universal search exposes its dialog, combobox, grouped options, loading state, result count,
  empty state, and errors with appropriate semantics and polite announcements.
- Global focus-visible styling makes keyboard location clear without adding a permanent pointer
  focus ring.
- Reduced-motion preferences collapse decorative animation and transition durations.
- Product previews, catalog cards, version thumbnails, and QR codes use `next/image` with explicit
  dimensions/sizing and unoptimized rendering. This supports local object URLs and the
  configured R2/CDN URLs without hard-coding a deployment hostname.

## Why this implementation

Mobile navigation retains the reconciled shared Radix Sheet instead of restoring the legacy custom drawer.
Focus management covers the two modal-like interactions that can otherwise strand a
keyboard user: mobile navigation and universal search. Quick Create retains menu semantics and
arrow navigation while adding a mobile-only Tab boundary. The browser's authenticated API and
tenancy behavior remain unchanged.

Automated coverage uses two complementary layers:

- `jest-axe` runs fast structural audits against navigation, Quick Create, product editing,
  version management, and the universal-search dialog in the existing Vitest/jsdom suite.
- Playwright runs the committed Storybook states in Chromium at desktop and mobile sizes. It
  verifies real focus movement and guards the product editor/version manager against horizontal
  overflow.

Storybook supplies deterministic product states without coupling this frontend PR to a database,
email provider, R2 credentials, or backend fixture account. The final release stage still owns the
authenticated end-to-end acceptance suite.

## Test and CI architecture

The Vendor Portal adds:

- `playwright.config.ts` with desktop Chromium and Pixel 5-compatible projects
- `e2e/vendor-workflows.spec.ts`
- `src/test/vendor-workflows.a11y.test.tsx`
- a `test:e2e` workspace script
- CI browser installation and responsive workflow execution

Vitest explicitly excludes `e2e/**`, keeping component and browser runners independent. Playwright
starts the local Storybook server itself and retains traces/screenshots only when a test fails.

## Verification

Run from the repository root:

```powershell
npm.cmd test --workspace @inventory-system/vendor-portal
npm.cmd run test:e2e --workspace @inventory-system/vendor-portal
npm.cmd run build --workspace @inventory-system/vendor-portal
npm.cmd run build-storybook --workspace @inventory-system/vendor-portal
npm.cmd run lint --workspace @inventory-system/vendor-portal
npm.cmd audit --omit=dev --audit-level=high
```

Before the first local Playwright run:

```powershell
npx.cmd playwright install chromium
```

Acceptance evidence for this branch:

- The reconciled component suite covers the TanStack-based editor, shared mobile navigation, shortcut dismissal, closed-menu Tab behavior, and search-button Enter handling.
- Five jest-axe component/workflow audits include the populated search suggestions, not only the empty dialog.
- Five Playwright desktop/mobile checks passed; the mobile-only focus test is intentionally skipped
  in the desktop project.
- Next.js and Storybook production builds passed.
- ESLint passed without warnings or errors.
- The final release must rerun the production dependency audit; earlier evidence is not treated as current approval.

Rendered evidence is stored in `docs/screenshots/vendor-11-*` for the product editor and version
manager at desktop/mobile sizes and the open mobile Quick Create sheet. Set
`CAPTURE_VENDOR_A11Y_EVIDENCE=true` when running the Playwright suite to regenerate these files.
The Storybook link mock forwards its anchor ref, so browser focus tests exercise the same reference behavior as Next.js links.

Automated tools cannot prove WCAG conformance. The release stage retains manual keyboard,
screen-reader, zoom, contrast, and responsive verification as a human acceptance gate.

## Security, data, and rollback

No API, authorization, schema, migration, or R2 object behavior changes. Next Image is deliberately
unoptimized because media URLs can come from local development or the configured R2/CDN origin;
the backend remains authoritative for which URLs a user may receive.

Rollback is frontend/test-only. Revert this stage to restore prior interaction behavior and remove
the Playwright/jest-axe dependencies and CI steps. No data rollback is required.

## Deferred work

- Authenticated cross-Organization browser flows, release screenshots, and the manual assistive-
  technology checklist belong to the release-verification PR.
- Image transformation/CDN optimization can be added later using measured performance data and a
  stable production media hostname.
- Inventory Portal accessibility patterns will be planned in the separate inventory chat.
