# OmniStock — repository guide

Monorepo for the OmniStock platform: vendor-facing catalog portal, planned inventory portal, and the
shared Express API. Turborepo + npm workspaces, Node 22, PostgreSQL, Prisma 7, Better Auth.

## Read the standards before writing code

Coding standards are binding, not advisory:

- [`docs/standards/README.md`](docs/standards/README.md) — non-negotiables, boundaries, TypeScript,
  naming, PR rules, and how enforcement works
- [`docs/standards/frontend.md`](docs/standards/frontend.md) — portal boundaries, feature slices,
  state ownership, the prop-drilling rule, hooks vs utilities, testing and Storybook bar
- [`docs/standards/backend.md`](docs/standards/backend.md) — layering, multi-tenancy, contracts,
  errors, Prisma, security, testing

Architecture decisions that the standards build on:
[ADR 001 — portal state ownership](docs/adr/001-portal-state-ownership.md),
[ADR 002 — same-origin BFF and runtime contracts](docs/adr/002-next-bff-and-api-contracts.md),
[Inventory Portal blueprint](docs/inventory-portal-architecture.md).

## Layout

```
apps/vendor-portal/    Next.js 16 App Router portal (Turbopack), same-origin /api/v1 BFF
packages/ui/           Shared presentational primitives (atoms/molecules), Tailwind + Radix
packages/contracts/    Zod request/response schemas — the only shared type source
packages/api/          Express API
packages/database/     Prisma schema, client, migrations
tools/                 Repo scripts, including check-standards.mjs
```

## Commands

```sh
npm run dev                 # portal on :3000, API on :4000
npm run build
npm test
npm run lint
npm run standards:check     # structural standards check (boundaries, sizes, story/test coverage)
npm run storybook           # component workshop on :6006
npm run audit:prod
```

Database (workspace `@inventory-system/database`): `generate`, `migrate:dev`, `migrate:deploy`,
`seed`, `test:integration`.

## Rules that are easy to get wrong here

- **Never import `@inventory-system/database` outside `packages/api/src/repositories/`.** The
  existing controllers that do are grandfathered in `tools/standards-baseline.json`; do not add more.
- **Never write an unscoped tenant query.** `where: { id, organizationId, deletedAt: null }`, always
  in the query, never checked afterwards in application code.
- **Never mirror server data into `useState`, Zustand, or storage.** TanStack Query is the cache.
- **Never drill a prop through more than one component that does not use it.** Compose, or call the
  hook where the data is needed.
- **Never reimplement `es-toolkit`, `usehooks-ts`, TanStack Query/Form, `nuqs`, or Radix.**
- **Never add to `tools/standards-baseline.json`.** It only shrinks.
- Money is integer minor units plus a currency code. No floating point, at any layer.

## Working on this repo

- State, layer, and file placement decisions come from the standards; if a case is not covered, say
  so and propose a rule rather than improvising silently.
- New behavior needs a test. `packages/ui` components need a co-located story and test.
- Run `npm run lint` and `npm run standards:check` before declaring work done.
