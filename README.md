# OmniStock inventory system

OmniStock is a monorepo for the vendor-facing catalog portal and the inventory platform API. The current implementation is a modular prototype built with Next.js, Express, PostgreSQL, Prisma, and shared TypeScript packages.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 11+
- PostgreSQL 14+

## Local setup

1. Copy `.env.example` to `.env` and replace `DATABASE_URL` and `BETTER_AUTH_SECRET`. The
   authentication secret must be unique and contain at least 32 characters. Configure SMTP when
   verification, invitation, and reset links need delivery.
2. Install the locked dependency graph:

    ```sh
    npm ci
    ```

3. Generate the Prisma client and apply development migrations:

    ```sh
    npm run generate --workspace @inventory-system/database
    npm run migrate:dev --workspace @inventory-system/database
    npm run seed --workspace @inventory-system/database
    ```

    Prisma 7 loads the database connection through the root `prisma.config.ts` and
    generates its ESM client into an ignored source directory. Seeding is explicit; migrations
    do not run it automatically. The PostgreSQL adapter defaults to 10 connections, a 5-second
    connection timeout, and a 30-second idle timeout. Override those values with the documented
    `PRISMA_POOL_*` environment variables only when the deployment capacity requires it.

4. Start the portal and API together:

    ```sh
    npm run dev
    ```

The vendor portal is available at `http://localhost:3000`; the API defaults to `http://localhost:4000`. The portal uses a same-origin `/api/v1/*` BFF and `API_INTERNAL_URL` for server-to-server access, so the Express origin is not exposed to browser code. Liveness and database readiness probes are exposed at `/health` and `/ready` on the API host.

Run the component workshop at `http://localhost:6006` with `npm run storybook`. It documents shared UI primitives and reusable portal components with controls, generated documentation, interaction examples, and accessibility auditing. Create a production-static build with `npm run build-storybook`.

The browser uses `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` for platform APIs and
`NEXT_PUBLIC_API_ORIGIN=http://localhost:4000` for native Better Auth calls. The origin is
derived from the API URL when the second value is omitted.

Uploaded images use the development-only local storage adapter and are served under `/uploads`. Production configuration requires the R2 driver and a CDN/public delivery origin; the disposable CI smoke environment is the only explicit local-storage exception. Direct browser uploads and image transformation are still scheduled for Phase 3.

## Verification

Run the same checks required by CI:

```sh
npm run build
npm test
npm run lint
npm run standards:check
npm run audit:prod
```

`standards:check` enforces the structural rules in [`docs/standards`](docs/standards/README.md) —
package and feature boundaries, backend layering, file size limits, and the story/test coverage bar.
Violations that predate the standards are grandfathered in `tools/standards-baseline.json`; the check
fails on anything new.

Run the clean/current-data database migration test with Docker:

```sh
npm run test:integration --workspace @inventory-system/database
```

If Docker is unavailable but the configured PostgreSQL role can create databases, use
`test:integration:local`. It creates a uniquely named temporary database and removes it after
the test. See [Prisma 7 migration and rollback](docs/prisma-7-upgrade.md) for architecture,
verification, and rollback details.

Browser sessions are revocable Better Auth database sessions carried by a Secure, HttpOnly,
SameSite cookie in production. Production startup requires explicit CORS origins, a public API
URL, and strong dedicated secrets. When the API is behind Cloudflare, set
`AUTH_CLIENT_IP_HEADER=cf-connecting-ip` only after confirming Cloudflare is the trusted ingress.
See [Better Auth migration and rollback](docs/better-auth-migration.md) for the identity model,
existing-user cutover, email settings, verification, and rollback procedure.
See [Vendor entitlements and Vendor Profile migration](docs/vendor-entitlements-migration.md) for
the Organization subscription/access rules, primary profile ownership, migration audit, and
staged-rollout compatibility behavior.
See [Vendor catalog tenancy and lifecycle hardening](docs/vendor-catalog-hardening.md) for
cross-profile isolation, system-record immutability, primary-version consistency, and concurrency
rules.
See [Vendor media, import, export, and search hardening](docs/vendor-media-import-search-hardening.md)
for R2 lifecycle safeguards, CSV boundaries, tenant-scoped search, and the repeatable 20,000-row
development benchmark.
See [Vendor authentication cleanup and rollback](docs/vendor-auth-cleanup.md) for the destructive
legacy removal gate, deployment order, final ownership model, verification, and recovery options.
See [Vendor Portal frontend authentication](docs/vendor-frontend-auth.md) for session hydration,
Organization switching, email verification, MFA, active-session controls, and frontend rollback.
See [Vendor Portal member invitations and access](docs/vendor-member-access.md) for the invitation
lifecycle, Owner controls, explicit portal access, tenancy rules, verification, and rollback.
See [Vendor product and version workflow hardening](docs/vendor-product-workflow-hardening.md) for
the product-first editor, recoverable dependency/media errors, lifecycle behavior, Storybook
coverage, verification, and rollback.

Portal state has explicit owners: TanStack Query for server data, `nuqs` for shareable list filters, TanStack Form plus Zod for forms, Zustand for harmless cross-route UI preferences, and local React/Radix state for ephemeral interactions. See the architecture records in [`docs/adr`](docs/adr).

CI also starts PostgreSQL, applies the migration history, boots the compiled API, and runs `node tools/smoke-api.mjs`. The same smoke script can validate a deployed environment by setting `API_SMOKE_BASE_URL` to its API origin; it creates and then deactivates an isolated test vendor.

## Standards

Coding standards are binding for all new code and are enforced by ESLint, `npm run standards:check`,
and review:

- [Coding standards index](docs/standards/README.md) — boundaries, TypeScript, naming, PR rules,
  enforcement, and the adoption baseline
- [Frontend standards](docs/standards/frontend.md) — portal boundaries, feature slices, state
  ownership, prop drilling, hooks and utilities, testing and Storybook
- [Backend standards](docs/standards/backend.md) — layering, multi-tenancy, contracts, errors,
  Prisma, security, testing

## Planning

- [Vendor portal implementation blueprint](docs/vendor-portal-implementation-plan.md)
