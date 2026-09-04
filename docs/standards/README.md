# OmniStock Coding Standards

**Status:** Active\
**Applies to:** every workspace in this monorepo\
**Companion documents:** [Frontend Standards](frontend.md) · [Backend Standards](backend.md) · [ADR 001](../adr/001-portal-state-ownership.md) · [ADR 002](../adr/002-next-bff-and-api-contracts.md)

---

## 1. Why this document exists

Two people reading the same file should reach the same conclusion about what it does. Everything
below serves that. Where a rule trades cleverness for readability, readability wins. Where it trades
brevity for testability, testability wins.

Rules here are one of three strengths:

| Marker     | Meaning                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| **MUST**   | Enforced. A violation fails lint, `node tools/check-standards.mjs`, or review. |
| **SHOULD** | Expected default. Deviating requires a one-line comment or PR note saying why. |
| **MAY**    | Allowed. Listed so nobody has to relitigate it.                                |

## 2. The non-negotiables

These are the rules that, if dropped, make every other rule unenforceable.

1. **State has exactly one owner.** Before writing state, name its owner from the table in
   [frontend.md §5](frontend.md#5-state-ownership). Two owners for one fact is a bug, not a style
   preference.
2. **Prop drilling stops at one hop.** A prop MUST NOT pass through more than one component that
   does not itself use it. See [frontend.md §6](frontend.md#6-the-prop-drilling-rule).
3. **Features are atomic.** A feature owns its components, hooks, queries, and utilities, and is
   consumed through its public surface only. No feature reaches into another feature's internals.
4. **The layer boundary is one-directional.** On the frontend: page → feature → shared. On the
   backend: route → controller → service → repository → domain. Never upward, never sideways.
5. **Prisma lives in repositories.** Nothing else imports `@inventory-system/database`.
6. **Every tenant-scoped query is scoped in the query.** Never filter a tenant in application code
   after the fact.
7. **Runtime shapes are validated at every boundary.** `@inventory-system/contracts` Zod schemas are
   the only cross-boundary type source. A TypeScript interface is not a runtime guarantee.
8. **Behavior is proven by a test.** New behavior with no test is unfinished work.

## 3. Repository map and dependency direction

```
apps/vendor-portal/       Next.js portal (App Router, Turbopack)
apps/<future-portal>/     e.g. inventory-portal
packages/ui/              Cross-portal presentational primitives (atoms/molecules/organisms)
packages/contracts/       Zod request/response schemas — the only shared type source
packages/api/             Express API (routes -> controllers -> services -> repositories -> domain)
packages/database/        Prisma schema, client, migrations
tools/                    Repo scripts (smoke, seeding, standards checker)
docs/                     Architecture, ADRs, standards
```

Permitted import directions (MUST):

```
apps/<portal>       --> packages/ui
                    --> packages/contracts

packages/api        --> packages/contracts
                    --> packages/database        (repositories only)

packages/ui         --> nothing in this repo except itself
packages/contracts  --> nothing in this repo
```

Forbidden (MUST NOT), each enforced by `tools/check-standards.mjs`:

- `apps/a` importing anything from `apps/b`. Portals share through `packages/*` or not at all.
- `packages/ui` importing `packages/contracts`, `packages/database`, `next`, or any app. The UI
  library knows about pixels, not about products.
- `packages/contracts` importing anything but `zod`.
- Deep imports past a package's public entry, such as `@inventory-system/ui/src/atoms/Button`.
  Import from the package root.

## 4. TypeScript

- **MUST** run under `strict`. Do not weaken `tsconfig` per workspace.
- **MUST NOT** use `any`. Already `error` in the portal's ESLint config. Use `unknown` at boundaries
  and narrow with a guard or a Zod parse.
- **MUST NOT** use non-null assertions (`!`) or unchecked `as` casts to silence the compiler. A cast
  is acceptable only immediately after a runtime check that proves it, with the check visible in the
  same function.
- **MUST** annotate the return type of every exported function. Internal functions **SHOULD** infer.
- **SHOULD** model alternatives as discriminated unions rather than optional-field bags or boolean
  pairs. `{ status: 'loading' } | { status: 'ready'; data: T }` beats `{ loading, error, data }`.
- **SHOULD** prefer union literals over TypeScript `enum`. Prisma-generated enums are the exception
  and are re-exported, never re-declared.
- **MUST** derive types from Zod schemas at boundaries (`z.infer<typeof schema>`) instead of writing
  a parallel interface that can drift.

## 5. Naming and files

| Thing                        | Convention                                                        | Example                                       |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| React component file         | `PascalCase.tsx`, one component per file, named for the component | `ProductCard.tsx`                             |
| Hook file                    | `use-kebab-case.ts`, or a feature's `hooks.ts`                    | `use-object-url.ts`                           |
| Utility / module file        | `kebab-case.ts`                                                   | `query-options.ts`, `download.ts`             |
| Backend layer file           | `kebab-case.<layer>.ts`                                           | `product.service.ts`, `product.repository.ts` |
| Test                         | `<subject>.test.ts(x)`, co-located                                | `Button.test.tsx`                             |
| Story                        | `<Component>.stories.tsx`, co-located                             | `Button.stories.tsx`                          |
| Type / interface / component | `PascalCase`                                                      | `ProductListQuery`                            |
| Variable / function          | `camelCase`                                                       | `buildSearchText`                             |
| Constant map / lookup        | `camelCase` at module scope                                       | `defaultErrorCodes`                           |
| API error code               | `SCREAMING_SNAKE_CASE`                                            | `UPSTREAM_UNAVAILABLE`                        |
| Boolean                      | `is` / `has` / `can` / `should` prefix                            | `isPrimary`, `canDelete`                      |

- **MUST** use named exports. Default exports are permitted only where a framework requires them
  (Next.js `page.tsx`, `layout.tsx`, `route.ts`, Express route modules).
- **MUST NOT** abbreviate beyond established domain terms. `qty` is fine; `prdVer` is not.
- Functions **SHOULD** be declared as arrow consts, matching the existing codebase.

## 6. Functions and control flow

- **MUST** keep a function to one job. If you need a comment to introduce its second half, it is two
  functions.
- **MUST** use guard clauses and early returns instead of nesting. Maximum nesting depth is 3.
- **MUST NOT** nest ternaries. One level is fine; two is a `switch`, a lookup map, or an extracted
  function.
- **MUST NOT** silently swallow errors. `catch {}` and `catch (e) { /* ignore */ }` are forbidden.
  Handle it, log it with context, or rethrow.
- **SHOULD** keep functions under 40 lines and parameter lists under 4. Beyond that, take an options
  object.
- **SHOULD** prefer pure functions. Anything that reads a clock, a random source, or the network
  takes it as an argument so tests can pin it.

## 7. Comments and documentation

- Comments explain **why**, never **what**. If the _what_ is unclear, rename things instead.
- **MUST NOT** commit commented-out code. Git remembers it.
- **MUST NOT** leave a `TODO` without a Linear issue key: `// TODO(OMN-123): …`.
- JSDoc **SHOULD** be reserved for exported functions whose contract is not obvious from the
  signature — units, ownership, invariants, side effects.
- A decision a future reader would reasonably want to reverse belongs in an ADR under `docs/adr/`,
  not in a code comment.

## 8. Dependencies

- **MUST** check, in order, before adding a dependency: (1) does a library we already ship do this,
  (2) is it twenty lines of our own code, (3) is it maintained and compatibly licensed. We already
  ship `es-toolkit`, `usehooks-ts`, `zod`, TanStack Query/Form, `nuqs`, Radix, and `lucide-react`.
  Reimplementing any of them is a review rejection.
- **MUST** pin versions through `package-lock.json` and install with `npm ci` in CI.
- **MUST** keep `npm run audit:prod` clean at `--audit-level=high`.
- New runtime dependencies **SHOULD** be called out explicitly in the PR description.

## 9. Formatting

Prettier is the authority; do not hand-format. Settings live in `.prettierrc`: 4-space indent, single
quotes, semicolons, 100-column print width, ES5 trailing commas, `prettier-plugin-tailwindcss` for
class sorting. Run `npm run format` before pushing.

## 10. Git and pull requests

- Commits **SHOULD** follow Conventional Commits with a scope:
  `feat(products): add version comparison`, `fix(api): scope template list by organization`,
  `docs(platform): document invitation handoff contract`.
- Branches: `<type>/<area>-<short-description>`, e.g. `feat/inventory-stock-ledger`.
- A PR **SHOULD** carry one concern and stay under roughly 400 changed lines excluding generated
  files. If it cannot, split it or say in the description why not.
- A PR **MUST NOT** mix a refactor with a behavior change. Land the refactor first.
- **MUST NOT** merge with a failing CI job, a skipped test, or an unresolved conversation.
- Migrations, new environment variables, and new error codes **MUST** be listed in the PR
  description.

## 11. Definition of Done

A change is done when all of the following are true:

- [ ] It does what the issue asked, and nothing the issue did not ask for.
- [ ] State, layer, and file placement follow §2–§3.
- [ ] New behavior has tests; changed behavior has updated tests.
- [ ] `npm run build`, `npm test`, `npm run lint`, and `node tools/check-standards.mjs` pass locally.
- [ ] Public API changes are reflected in `packages/contracts`.
- [ ] No new entries were added to `tools/standards-baseline.json`.
- [ ] The PR description names migrations, env vars, and error codes it introduces.

## 12. How these standards are enforced

| Rule class                           | Mechanism                             | Where                                  |
| ------------------------------------ | ------------------------------------- | -------------------------------------- |
| Formatting                           | Prettier                              | `.prettierrc`, `npm run format`        |
| Type safety, hooks, `any`, `console` | ESLint                                | `apps/vendor-portal/eslint.config.mjs` |
| Layer and package boundaries         | `tools/check-standards.mjs`           | CI step **Check standards**            |
| Story and test coverage bar          | `tools/check-standards.mjs`           | CI step **Check standards**            |
| Controller size and Prisma leakage   | `tools/check-standards.mjs`           | CI step **Check standards**            |
| Everything else                      | Review, using §11 and the PR template | `.github/pull_request_template.md`     |

Run the structural checks locally:

```sh
node tools/check-standards.mjs
```

### The baseline, and the ratchet

`tools/standards-baseline.json` lists the violations that already existed when these standards were
adopted. They are **grandfathered, not forgiven**. The checker fails on any violation _not_ in the
baseline, so existing debt can never grow.

Two rules govern the baseline:

1. **It only shrinks.** Removing an entry is a normal PR. Adding one requires explicit approval in
   review and a Linear issue recording the repayment plan.
2. **Boy-scout scope.** When you touch a file that appears in the baseline, you fix the _code path
   you touched_ — you are not obliged to fix the whole file. See
   [backend.md §3](backend.md#3-migrating-the-existing-controllers) for the ordered repayment plan.
3. **Size entries are ceilings.** For the file-size rules, a baselined entry records the file's
   length at adoption. The file may shrink freely, but growing past that recorded length fails the
   check. An oversized file is allowed to stay oversized; it is not allowed to get worse.

Regenerate the baseline only when deliberately adopting new debt, and say so in the PR:

```sh
npm run standards:baseline
```

### Adoption status

The baseline recorded at adoption. This table is the repayment scoreboard; it should only ever get
smaller.

| Rule                        | Entries | Where the debt is                                                                                                                                               |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature-reach-in`          | 44      | Features have no `index.ts` yet, so routes and hooks import internals directly. Cheapest fix in the list: add a public surface per feature and update imports.  |
| `ui-missing-story`          | 18      | `packages/ui` components have stories, but they live in `apps/vendor-portal/src/stories/ui/`. Migration is a move, not new work.                                |
| `ui-missing-test`           | 18      | `packages/ui` has no test harness yet. Needs Vitest wired into the package.                                                                                     |
| `prisma-outside-repository` | 12      | Every controller, plus `middleware/auth.ts`, `index.ts`, and `vendor-profile.service.ts`. See [backend.md §3](backend.md#3-migrating-the-existing-controllers). |
| `hook-missing-test`         | 8       | Feature `hooks.ts` files and `use-object-url.ts`.                                                                                                               |
| `controller-too-large`      | 7       | The fat controllers, worst first in backend.md §3.                                                                                                              |
| `component-too-large`       | 3       | `ProductVersionManager`, `UniversalSearch`, and the search route.                                                                                               |
| `util-missing-test`         | 3       | `download.ts`, `image.ts`, `cn.ts`.                                                                                                                             |
| `express-in-service`        | 2       | `session.service.ts`, `better-auth-response.service.ts` take `Request`/`Response`.                                                                              |
| `route-too-large`           | 1       | `app/dashboard/search/page.tsx` holds a feature inside a route file.                                                                                            |

Suggested first three repayments, by value per hour: feature `index.ts` files (kills 44 entries and
locks in the atomicity rule), moving the UI stories into `packages/ui`, then extracting
`vendor.controller.ts` to prove the backend layering shape on the smallest file.
