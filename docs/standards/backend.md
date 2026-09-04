# Backend Standards

**Status:** Active\
**Applies to:** `packages/api`, `packages/database`, `packages/contracts`, and the portal BFF route
handlers in `apps/*/src/app/api/**`\
**Read first:** [Coding Standards index](README.md) — rule strengths (MUST/SHOULD/MAY), TypeScript,
naming, and enforcement live there and are not repeated here.

---

## 0. Priorities

1. **Correctness under multi-tenancy.** The worst bug this system can ship is one organization
   seeing another's data. Every other concern ranks below this one.
2. **Explicit boundaries.** HTTP, business rules, persistence, and pure domain logic are four
   different things in four different files.
3. **Testability.** Business rules that need a database to test are business rules nobody tests.
4. **Auditability.** Money and stock movements are facts, not mutable fields.
5. **Predictable contracts.** A client should never have to special-case one endpoint's shape.

## 1. Layering

```
routes/         HTTP wiring only: path, middleware chain, validate(schema), handler reference
controllers/    Translate HTTP <-> service. Read validated input, call ONE service, send envelope
services/       Use cases: authorization decisions, orchestration, transactions
repositories/   The ONLY place that imports @inventory-system/database. Data access, nothing else
domain/         Pure functions and types. No I/O, no Express, no Prisma
validators/     Zod schemas, composed from @inventory-system/contracts
middleware/     Cross-cutting HTTP concerns: auth, request context, envelope, rate limit, upload
config.ts       Environment parsed and validated at boot
```

Dependency direction is strictly downward. A service **MUST NOT** import a controller; a repository
**MUST NOT** import a service; `domain/` **MUST NOT** import anything from the other layers.

### 1.1 Routes

- **MUST** contain path, HTTP verb, middleware chain, and a handler reference. Nothing else.
- **MUST** attach `validate(schema)` to every route that reads a body, query, or params.
- **MUST** attach the authorization middleware appropriate to the resource, and **MUST** order
  specific paths before parameterized ones (`/products/export` before `/products/:id`).
- **SHOULD** apply a rate limiter class per route group; authentication and search are already
  stricter than the general limiter.

### 1.2 Controllers

- **MUST NOT** import `@inventory-system/database` or any Prisma type. Checked in CI.
- **MUST NOT** contain business rules, branching on domain state, CSV parsing, serialization
  strategy, or query construction.
- **MUST** read only validated input, call exactly one service method, and send the response
  envelope. Roughly: unwrap, delegate, wrap.
- **MUST** stay under **150 lines**. A controller that cannot is holding a service inside it.
- **MUST** delegate errors to `next(error)` rather than formatting them locally.

```ts
// The whole shape of a compliant controller method
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, meta } = await productService.list(req.tenant, req.validated.query);
    res.json({ success: true, data, meta });
});
```

### 1.3 Services

- **MUST** own the use case: authorization decisions, orchestration across repositories, transaction
  boundaries, and emitted side effects (email, storage, audit).
- **MUST** take their dependencies explicitly — repositories, clock, storage, mailer — as constructor
  or factory arguments. A service that reaches for a module-scoped singleton cannot be unit tested
  without booting the world.
- **MUST NOT** know about `req`, `res`, headers, status codes, or Express. A service that imports
  `express` is a layering violation and is checked in CI.
- **MUST** raise typed domain errors (§4), never HTTP responses.
- **SHOULD** be one file per aggregate (`product.service.ts`), one exported function per use case.

### 1.4 Repositories

- **MUST** be the only importers of `@inventory-system/database`.
- **MUST** accept a tenant scope as a required argument on every method that touches tenant data
  (§5). A repository method signature with a bare `id: string` and no tenant is a bug by
  construction.
- **MUST** return plain domain-shaped objects. Prisma model types **MUST NOT** appear in a service or
  controller signature — that leak is how "just swap the ORM later" becomes impossible and how
  `include` shapes end up as the public API.
- **MUST** accept an optional transaction client so a service can compose several repository calls in
  one transaction.
- **MUST NOT** contain business rules. `findExpiringLots(tenant, before)` is a repository;
  "should we reorder this" is domain.

### 1.5 Domain

- **MUST** be pure: no database, no HTTP, no clock, no randomness, no environment.
- **MUST** hold the rules worth being certain about — pricing, costing, margin, stock allocation,
  CSV row mapping, status derivation, reorder suggestion.
- These are the functions that get exhaustive unit tests, because they are cheap to test and
  expensive to get wrong. `getEffectiveStatus` and `normalizeCsvRow`, currently living inside
  `product.controller.ts`, are textbook domain functions in the wrong place.

## 2. What "good" looks like end to end

```
POST /api/v1/products
  routes/product.routes.ts     verifyAuth -> requirePortal('vendor') -> validate(createProductSchema)
  controllers/product.controller.ts   read req.validated.body -> productService.create(...)
  services/product.service.ts  authorize -> domain.buildProduct() -> $transaction(repo writes)
  repositories/product.repository.ts  prisma.product.create({ data, where scoped by org })
  domain/product.ts            pure: derive status, normalize SKU, validate invariants
```

## 3. Migrating the existing controllers

Today every controller imports Prisma directly and holds business logic; `services/` is thin. That
is recorded, not accepted.

**The rule from today:** all _new_ endpoints and _new_ controllers MUST be fully compliant. The
existing files below are grandfathered in `tools/standards-baseline.json`, and the checker fails on
anything new.

**Boy-scout obligation:** when a PR touches a grandfathered controller, it extracts the code path it
touches into a service, repository, and domain function — that path only, not the whole file. This is
what makes the debt repay itself along the lines of actual work rather than in a big-bang refactor
nobody schedules.

Ordered repayment plan, worst first:

| #   | File                                        | Lines | Notes                                                                                                                                      |
| --- | ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `controllers/product.controller.ts`         | 1005  | CSV import/export, image handling, serialization, status derivation. Extract `product.repository`, `product-csv.domain`, `product.service` |
| 2   | `controllers/product-version.controller.ts` | 603   | Version comparison and primary-version rules are pure domain                                                                               |
| 3   | `controllers/platform.controller.ts`        | 377   | Entitlement checks belong in a service used by middleware too                                                                              |
| 4   | `controllers/auth.controller.ts`            | 334   | Better Auth response mapping into `services/`                                                                                              |
| 5   | `controllers/search.controller.ts`          | 269   | Query construction into a repository                                                                                                       |
| 6   | `controllers/category.controller.ts`        | 253   |                                                                                                                                            |
| 7   | `controllers/template.controller.ts`        | 183   |                                                                                                                                            |
| 8   | `controllers/vendor.controller.ts`          | 123   | Smallest; a good first proof of the pattern                                                                                                |
| 9   | `services/vendor-profile.service.ts`        | 76    | Imports Prisma directly; needs a repository underneath                                                                                     |

Each row **SHOULD** become a Linear issue in team OMN. Start with #8 to establish the shape, then
work down from #1.

## 4. Errors and the response envelope

Every JSON response uses the envelope from
[ADR 002](../adr/002-next-bff-and-api-contracts.md), enforced by `middleware/response-envelope.ts`:

```jsonc
// success
{ "success": true, "data": {}, "message": "optional", "meta": {} }
// failure
{ "success": false, "message": "…", "code": "…", "statusCode": 400, "requestId": "…", "issues": [] }
```

- **MUST NOT** send a bare entity or array. `res.json(product)` is a violation.
- **MUST** throw typed errors from services, and let `middleware/error-handler.ts` translate them:

```ts
export class AppError extends Error {
    constructor(message: string, readonly statusCode: number, readonly code: string) { … }
}
export class NotFoundError extends AppError { … }      // 404 NOT_FOUND
export class ForbiddenError extends AppError { … }     // 403 FORBIDDEN
export class ConflictError extends AppError { … }      // 409 CONFLICT
export class ValidationError extends AppError { … }    // 400 VALIDATION_ERROR, carries issues[]
```

- **MUST** treat `code` as public API surface. Codes are `SCREAMING_SNAKE_CASE`, stable, and
  registered in `@inventory-system/contracts` so the portal can branch on them without string
  guessing. Changing a code is a breaking change.
- **MUST NOT** leak internal detail to clients — no stack traces, no Prisma messages, no SQL, no
  file paths. Map known Prisma failures at the repository or error-handler boundary:
  `P2002 → 409 CONFLICT`, `P2025 → 404 NOT_FOUND`, `P2003 → 409 CONSTRAINT_VIOLATION`.
- **MUST** wrap every async handler so rejections reach the error handler. Express 4 does not catch
  async rejections; an unwrapped `async` handler that throws hangs the request. Use a shared
  `asyncHandler` rather than 14 hand-written `try/catch` blocks per file.
- **MUST NOT** log-and-rethrow at more than one level. Log where you handle.
- **SHOULD** distinguish "not found" from "not yours" carefully: return **404** for a resource in
  another tenant. A 403 confirms the resource exists and leaks across the tenant boundary.

## 5. Multi-tenancy and authorization

The most important section in this document.

- **MUST** scope every tenant-owned query inside the query itself:
  `where: { id, organizationId, deletedAt: null }`. Fetching by `id` and then comparing
  `row.organizationId` in application code is forbidden — one early return away from a data breach,
  and invisible in review.
- **MUST** treat every identifier from a client as untrusted. Possession of an ID implies nothing
  about ownership.
- **MUST** resolve authorization in the documented chain — authenticated session → active `Member` →
  active portal subscription → owner or `MemberPortalAccess` → role assignment — and fail at the
  first step, before any domain work. See
  [the architecture blueprint](../inventory-portal-architecture.md#42-authorization-chain).
- **MUST** make the tenant scope an explicit parameter through the layers (`req.tenant` →
  service → repository). Do not read it from a module singleton, an AsyncLocalStorage global, or the
  request object inside a repository.
- **MUST** include `deletedAt: null` in every read path for soft-deleted models.
- **MUST** filter authorization-sensitive _fields_, not just rows. `INVENTORY_STAFF` cannot see
  purchase cost or margin, so those fields are excluded in the repository `select`, not hidden in the
  UI.
- **MUST** cover every tenant-scoped endpoint with a cross-tenant denial test (§10).

## 6. Validation and contracts

- **MUST** define request and response schemas in `@inventory-system/contracts`. The API validates
  input against them and the portal parses responses against them, so drift becomes a test failure
  instead of a production surprise.
- **MUST** validate at the edge with `validate(schema)` and then read only validated data. Reading
  `req.body` after validating is how an unvalidated field sneaks through; validated output **SHOULD**
  be attached (`req.validated`) and typed.
- **MUST** use `.strict()` on request object schemas so unknown fields are rejected rather than
  silently ignored.
- **MUST** coerce and bound every numeric query parameter — `page`, `limit`, and any range. `limit`
  has a hard maximum (100 unless a documented reason says otherwise); an unbounded `limit` is a
  denial-of-service vector.
- **MUST** serialize dates as ISO-8601 strings with offset (`isoDateSchema`).
- **MUST** represent money as integer minor units plus an explicit currency code, per the
  [product principles](../inventory-portal-architecture.md#2-product-principles). No `Float`, no
  JavaScript `number` arithmetic on money, no currency-less amounts.
- **MUST NOT** define a response type as a hand-written interface. Infer it from the schema.

## 7. Database and Prisma

- **MUST** keep the schema in `packages/database` and generate the client through the root
  `prisma.config.ts`.
- **MUST** ship one migration per PR, and **MUST NOT** edit a migration that has been applied
  anywhere. Corrections are new migrations.
- **MUST** write migrations to be safe against a running old version: additive first (add nullable
  column, backfill, then enforce), never a destructive rename in a single step.
- **MUST** state the rollback plan in the PR for any migration that is not trivially additive, as
  `docs/prisma-7-upgrade.md` and `docs/vendor-entitlements-migration.md` do.
- **MUST** own transactions in the service layer via `prisma.$transaction`, passing the transaction
  client down to repositories. Any use case with two or more writes that must both succeed is a
  transaction.
- **MUST** index every foreign key, every column used to filter or sort a list endpoint, and every
  tenant scope column. A list endpoint without a supporting index is an incident scheduled for later.
- **MUST** use explicit `select`/`include`. `select` the fields the caller needs; do not return whole
  rows by habit, especially not ones containing credentials, tokens, or cost data.
- **MUST NOT** query inside a loop. Batch with `in`, or shape the `include` correctly. N+1 is the
  default failure mode of an ORM and is a review rejection.
- **MUST** paginate every list query. There is no endpoint that returns "all" of a tenant's rows.
- **MUST** treat ledger and audit tables as append-only. Corrections are compensating entries; no
  `UPDATE`, no `DELETE`.
- **SHOULD** enforce real invariants with database constraints (unique, check, foreign key), not only
  in application code. Two concurrent requests do not see each other's application-level checks.
- **SHOULD** name migrations descriptively: `20260904_add_stock_movement_ledger`.

## 8. API design

- **MUST** be resource-oriented under `/api/v1`: plural lowercase nouns, hyphenated multiwords,
  nesting only to express real ownership (`/products/:productId/versions/:versionId`). Verbs in
  paths are reserved for genuine non-CRUD actions on a resource
  (`POST /products/:id/versions/:versionId/primary`).
- **MUST** use status codes consistently:

| Code | Use                                                                        |
| ---- | -------------------------------------------------------------------------- |
| 200  | Successful read, update, or action                                         |
| 201  | Resource created; include the created resource in `data`                   |
| 204  | Deliberately empty response — rare here, since the envelope carries a body |
| 400  | Validation failure; include `issues[]`                                     |
| 401  | No or invalid session                                                      |
| 403  | Authenticated but not permitted (never for cross-tenant — see §4)          |
| 404  | Not found, or not visible to this tenant                                   |
| 409  | Conflict: uniqueness, state transition, concurrent edit                    |
| 413  | Upload too large                                                           |
| 429  | Rate limited                                                               |
| 500  | Unexpected — logged with `requestId`, opaque to the client                 |

- **MUST** keep `v1` backward compatible: adding an optional field or a new endpoint is fine; removing
  a field, renaming one, tightening validation, or changing an error `code` is not. Breaking changes
  create `v2`.
- **MUST** use a consistent list contract: `page`, `limit`, `sort`, filters as query parameters, and
  `meta: { total, page, limit, totalPages }` in the envelope.
- **MUST** accept an `Idempotency-Key` header on any POST that creates a financial or stock-movement
  fact, and return the original result on replay. Retries and double-clicks are certain; duplicated
  ledger entries must not be.
- **SHOULD** stream large exports (CSV) rather than building them in memory.
- **SHOULD** move any operation that cannot reliably finish in about two seconds to a background job
  and return a job handle.

## 9. Security, configuration, and observability

- **MUST** parse and validate all environment configuration at boot with Zod and refuse to start when
  it is invalid — the existing `config.ts` is the reference. No `process.env` access outside it.
- **MUST NOT** commit secrets. `.env.example` documents every variable with a safe placeholder, and
  new variables **MUST** be added there in the same PR.
- **MUST** keep `helmet`, explicit CORS origins, and rate limiting enabled, with a stricter limiter
  for authentication and search.
- **MUST** use Better Auth database sessions carried by a Secure, HttpOnly, SameSite cookie. No token
  in `localStorage`, no long-lived bearer token in browser code.
- **MUST** hash passwords with the configured algorithm through `password.service`, never ad hoc.
- **MUST** validate uploads on type, size, and count; **MUST NOT** trust a client filename; **MUST**
  store to object storage with a generated key. Production uses R2, not local disk.
- **MUST NOT** log secrets, tokens, passwords, cookies, or full request bodies. Log identifiers, not
  payloads.
- **MUST** emit structured JSON logs with `requestId`, and propagate that ID through the BFF to the
  client so a user-reported failure is traceable end to end.
- **MUST NOT** use `console.log` in services or repositories. One logger module, with levels.
- **SHOULD** log exactly one outcome line per request, plus explicit events for security-relevant
  actions: login, failed login, permission denied, invitation, role change, export.
- **SHOULD** keep `/health` (liveness) and `/ready` (database readiness) accurate and cheap.

## 10. Testing

The pyramid, widest at the bottom:

| Level                      | What                                                             | Tooling               | Speed        |
| -------------------------- | ---------------------------------------------------------------- | --------------------- | ------------ |
| **Domain unit**            | Pure functions: pricing, costing, status derivation, CSV mapping | Jest, no mocks        | Milliseconds |
| **Service unit**           | Use cases with fake/in-memory repositories                       | Jest                  | Fast         |
| **Repository integration** | Real queries against a real PostgreSQL                           | Testcontainers        | Slower       |
| **Route integration**      | Full middleware chain over HTTP                                  | `supertest`           | Slower       |
| **Smoke**                  | Critical flows against a booted API                              | `tools/smoke-api.mjs` | Slowest      |

Required for every new endpoint, minimum:

1. Happy path with the expected envelope and status code.
2. Unauthenticated request → 401.
3. Invalid input → 400 with the expected `issues` paths.
4. **Cross-tenant access → 404.** Non-negotiable; see §5.
5. For role-gated endpoints, one test per role that must be denied.

Rules:

- **MUST** make every test create its own fixtures and clean up. No dependence on seed data, on
  execution order, or on another test's leftovers.
- **MUST** assert against the contract schema (`schema.parse(response.body)`) in route tests, not
  against hand-written expectations that can drift from `packages/contracts`.
- **MUST** test business rules at the domain level rather than through HTTP. If a pricing rule can
  only be exercised by a `supertest` call, it is in the wrong layer.
- **MUST NOT** mock Prisma to test a repository. Mocked query builders assert that you wrote the
  code you wrote.
- **SHOULD** cover every migration with the existing migration-test harness in `packages/database`.
- **SHOULD** add a regression test with every bug fix, written to fail before the fix.

## 11. Backend Definition of Done

- [ ] Layers respected: no Prisma outside repositories, no Express in services, no business logic in
      controllers, `domain/` still pure.
- [ ] Every query is tenant-scoped in the query, with `deletedAt: null` on soft-deleted models.
- [ ] Request and response schemas are in `@inventory-system/contracts`, `.strict()`, with bounded
      `limit`.
- [ ] Responses use the envelope; new error codes are registered and listed in the PR.
- [ ] Async handlers are wrapped; no error is swallowed; nothing internal leaks to the client.
- [ ] Multi-write use cases run in a transaction; new filter/sort columns are indexed.
- [ ] Migration is additive-safe, one per PR, with a rollback note; `.env.example` updated.
- [ ] Tests cover happy path, 401, 400, cross-tenant 404, and each denied role.
- [ ] `npm run build`, `npm test`, `npm run lint`, `npm run audit:prod`, and
      `node tools/check-standards.mjs` pass.
- [ ] If a grandfathered controller was touched, the touched path was extracted and its baseline
      entry updated.
