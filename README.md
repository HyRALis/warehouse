# OmniStock inventory system

OmniStock is a monorepo for the vendor-facing catalog portal and the inventory platform API. The current implementation is a modular prototype built with Next.js, Express, PostgreSQL, Prisma, and shared TypeScript packages.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 11+
- PostgreSQL 14+

## Local setup

1. Copy `.env.example` to `.env` and replace `DATABASE_URL`, `JWT_SECRET`, and
   `BETTER_AUTH_SECRET`. Both secrets must be unique and at least 32 characters; they must not
   share a value. Configure SMTP when verification, invitation, and reset links need delivery.
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

CI also starts PostgreSQL, applies the migration history, boots the compiled API, and runs `node tools/smoke-api.mjs`. The same smoke script can validate a deployed environment by setting `API_SMOKE_BASE_URL` to its API origin; it creates and then deactivates an isolated test vendor.

## Planning

- [Vendor portal implementation blueprint](docs/vendor-portal-implementation-plan.md)
