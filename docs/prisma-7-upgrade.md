# Prisma 7 migration and rollback

## Scope

This change upgrades the existing Vendor Portal persistence runtime from Prisma 5 to Prisma
7.10.0 without changing the database schema or user-visible vendor behavior. Better Auth and
organization models are intentionally excluded and begin only after this pull request merges.

## Runtime architecture

- Node.js 22 and npm 11 are the supported runtime and package-manager versions.
- The root `prisma.config.ts` explicitly loads the repository `.env`, schema path,
  migration path, seed command, and `DATABASE_URL`.
- The Prisma schema uses the `prisma-client` generator with an explicit ESM output at
  `packages/database/src/generated/prisma`.
- Generated client files are ignored and recreated by `npm run generate --workspace
  @inventory-system/database` and the database build.
- `@prisma/adapter-pg` owns the PostgreSQL connection pool.
- `packages/database/src/index.ts` creates one process-wide Prisma Client and exports a factory
  for isolated migration tests.
- The API is bundled as Node 22 ESM and imports the built ESM database and shared-type packages.
- SIGTERM and SIGINT stop accepting HTTP requests before disconnecting Prisma.
- The root lockfile overrides Prisma CLI-only transitive packages `deepmerge-ts` and `mysql2`
  to patched releases. Prisma 7.10.0 currently pins older vulnerable releases even though the
  application uses PostgreSQL. Generation, migration, seeding, and integration tests verify
  compatibility with the overrides.

## Pool configuration

| Environment variable | Default | Purpose |
|---|---:|---|
| `PRISMA_POOL_MAX_CONNECTIONS` | 10 | Maximum PostgreSQL connections per API process. |
| `PRISMA_POOL_CONNECTION_TIMEOUT_MS` | 5000 | Maximum wait while establishing a connection. |
| `PRISMA_POOL_IDLE_TIMEOUT_MS` | 30000 | Idle connection lifetime before pool release. |

Values must be positive integers. Invalid or missing values use the documented defaults. Scale
the maximum only after accounting for the database connection limit and the number of API
processes.

## Migration procedure

1. Install the locked dependency graph with `npm ci`.
2. Run `npm run generate --workspace @inventory-system/database`.
3. Run `npm run migrate:deploy --workspace @inventory-system/database`.
4. Run `npm run seed --workspace @inventory-system/database` explicitly when system catalog
   records are required.
5. Run `npm run seed:verify --workspace @inventory-system/database`.
6. Build and test the repository.

Prisma 7 does not introduce a SQL migration in this pull request. Existing migration history and
checksums remain unchanged. The runtime is therefore deployable before and after current catalog
data without rewriting rows.

## Verification

`packages/database/tests/prisma-migrations.test.ts` supports two equivalent modes:

- `test:integration` starts PostgreSQL 16 with Testcontainers, applies the full migration history
  to an empty database, seeds twice, creates a representative vendor/product/version graph,
  redeploys migrations, and verifies identifiers, status, characteristics, ownership, and the
  primary version.
- `test:integration:local` performs the same assertions in a uniquely named temporary database
  on the configured local PostgreSQL server. It disconnects clients and drops only that database.

The ordinary database `test` command skips container work unless `RUN_DATABASE_INTEGRATION` is
`true` or `local`. CI sets it to `true` so the Testcontainers path is mandatory in pull requests.

## Rollback

The preferred rollback is application-only because this pull request adds no SQL migration:

1. Stop the Prisma 7 API processes so their adapter-owned pools disconnect.
2. Deploy the previous application commit and its Prisma 5 lockfile.
3. Run that commit's Prisma client generation command.
4. Start the previous API and verify `/health`, `/ready`, and one authenticated catalog read.

Do not roll back or delete database migrations. No rows or columns need to be reversed. System
catalog seeding is idempotent and remains compatible with the existing schema. If the upgrade
fails before application cutover, keep the current database untouched and redeploy the previous
artifact.

## Security and tenancy

The adapter receives the connection string from environment configuration only; it is never
logged or committed. This PR does not change authentication, tenant keys, or authorization.
Existing `vendorId` scopes and database constraints remain in force until the later entitlement
and Vendor Profile migration.

`npm audit --omit=dev --audit-level=high` reports zero vulnerabilities with the locked overrides.
Do not remove the overrides until a Prisma 7 release resolves both transitive advisories, and
rerun all Prisma verification before changing either override version.
