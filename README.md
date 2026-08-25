# OmniStock inventory system

OmniStock is a monorepo for the vendor-facing catalog portal and the inventory platform API. The current implementation is a modular prototype built with Next.js, Express, PostgreSQL, Prisma, and shared TypeScript packages.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 11+
- PostgreSQL 14+

## Local setup

1. Copy `.env.example` to `.env` and replace `DATABASE_URL` and `JWT_SECRET`. The JWT secret must be unique and at least 32 characters.
2. Install the locked dependency graph:

   ```sh
   npm ci
   ```

3. Generate the Prisma client and apply development migrations:

   ```sh
   npm run generate --workspace @inventory-system/database
   npm run migrate:dev --workspace @inventory-system/database
   ```

4. Start the portal and API together:

   ```sh
   npm run dev
   ```

The vendor portal is available at `http://localhost:3000`; the API defaults to `http://localhost:4000`. Liveness and database readiness probes are exposed at `/health` and `/ready` on the API host.

Uploaded images use the development-only local storage adapter and are served under `/uploads`. Production configuration requires the R2 driver and a CDN/public delivery origin; the disposable CI smoke environment is the only explicit local-storage exception. Direct browser uploads and image transformation are still scheduled for Phase 3.

## Verification

Run the same checks required by CI:

```sh
npm run build
npm test
npm run lint
npm run audit:prod
```

Browser sessions use an HttpOnly, SameSite cookie. Production startup requires explicit CORS origins, a public API URL, and a strong JWT secret.

CI also starts PostgreSQL, applies the migration history, boots the compiled API, and runs `node tools/smoke-api.mjs`. The same smoke script can validate a deployed environment by setting `API_SMOKE_BASE_URL` to its API origin; it creates and then deactivates an isolated test vendor.

## Planning

- [Vendor portal implementation blueprint](docs/vendor-portal-implementation-plan.md)
