# Frontend Standards

**Status:** Active\
**Applies to:** `apps/*` and `packages/ui`\
**Read first:** [Coding Standards index](README.md) — rule strengths (MUST/SHOULD/MAY), TypeScript,
naming, and enforcement live there and are not repeated here.

---

## 0. Priorities

In order. When two of these conflict, the higher one wins.

1. **Readability.** The next person reads this code far more often than you write it.
2. **Testability.** If a thing is hard to test, its design is wrong. Fix the design, not the test.
3. **Atomicity.** One feature, one owner, one place to change it.
4. **Consistency.** A predictable codebase beats a locally optimal file.
5. **Performance.** Real, measured. Not speculative.
6. **Accessibility.** Currently a floor, not a gate — see [§12](#12-accessibility).

## 1. Architecture: portals inside one repository

The frontend is a set of **portal applications** in a single Turborepo workspace, each built by
Next.js with Turbopack, each owning its routes, features, and deployment surface, all drawing from
one shared UI library. `vendor-portal` exists today; `inventory-portal` is designed in
[the architecture blueprint](../inventory-portal-architecture.md).

The independence that matters is **ownership independence**: a portal team can ship without
coordinating with another portal team, because there is no code path between them. The rules below
exist to keep that true as the second portal arrives.

### 1.1 What lives where

| Layer         | Location                                            | Owns                                                                  | MUST NOT contain                                        |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Route         | `apps/<portal>/src/app/**`                          | URL structure, layouts, server-side data prefetch, metadata           | Business logic, fetch calls, more than composition      |
| Feature       | `apps/<portal>/src/features/<feature>/**`           | A vertical slice: components, hooks, queries, forms, utils            | Imports from another feature's internals                |
| Portal shared | `apps/<portal>/src/{components,hooks,lib,state}/**` | Cross-feature portal concerns: shell, providers, API client, UI store | Domain rules belonging to a single feature              |
| Shared UI     | `packages/ui/src/**`                                | Presentational primitives, design tokens, `cn()`                      | Domain vocabulary, data fetching, routing, portal state |
| Contracts     | `packages/contracts/src/**`                         | Zod request/response schemas and inferred types                       | Anything but `zod`                                      |

### 1.2 Portal boundary rules

- **MUST NOT** import from another portal. `apps/inventory-portal` importing
  `apps/vendor-portal/src/...` is forbidden and checked in CI. If two portals need the same thing,
  promote it (§1.3) or duplicate it deliberately and say so in the PR.
- **MUST NOT** deep-import a package. `@inventory-system/ui` and `@inventory-system/contracts` are
  imported from their root only.
- **MUST** keep `packages/ui` free of domain vocabulary. A prop named `product`, `vendorId`, or
  `stockLocation` in `packages/ui` is a design error — the component belongs to a feature. Generic
  props (`title`, `items`, `onSelect`, `variant`) are the whole point.
- **MUST NOT** put data fetching, TanStack Query, `nuqs`, or `next/*` imports in `packages/ui`. It
  renders what it is given.

### 1.3 Promotion to `packages/ui`

A component moves from a portal into the shared library only when **all** of these hold:

1. It is used by two or more portals, or a written commitment exists that the second portal will use
   it in the current cycle.
2. Its props contain zero domain vocabulary.
3. It performs no data fetching and reads no portal state.
4. It ships with a co-located story and test, and passes the a11y addon with no violations.

Two portals rendering superficially similar things is **not** grounds for promotion. Premature
sharing is the standard way a shared library becomes a dumping ground with fourteen boolean props.
Duplicate first, promote when the shape has stopped moving.

Promotion is a standalone PR: move the component, add the story and test, delete the original,
update imports. No behavior change in the same PR.

## 2. Feature-slice structure (atomicity)

A feature is the unit of ownership. Everything a feature needs lives under its folder, and everything
under its folder belongs to it alone.

```
src/features/<feature>/
  components/          Feature components (presentational and container)
  hooks.ts             Client hooks — the feature's behavioral surface
  query-options.ts     TanStack Query option factories (framework-agnostic, testable)
  queries.ts           Optional: shared read hooks other features may consume
  server.ts            Server-only fetchers for RSC prefetch/hydration
  schemas.ts           Optional: feature-local Zod not shared cross-boundary
  utils/               Pure functions
  index.ts             The feature's public surface
```

Rules:

- **MUST** expose a feature through `index.ts`. Anything not exported there is private.
- **MUST NOT** import another feature's internals. `@/features/products/components/ProductCard` from
  inside the `bulk` feature is a violation; `@/features/products` is not.
- **SHOULD** avoid cross-feature imports altogether. If two features need the same component, it is
  either portal-shared (`src/components/`) or a UI primitive (`packages/ui`). The exception is a
  genuine domain dependency — the `auth` feature's `useCurrentVendor` is consumed everywhere, and
  that is correct, because tenancy is a cross-cutting fact.
- **MUST** keep query keys in the shared factory (`src/features/query-keys.ts`) so invalidation is
  possible across features. Ad-hoc inline arrays as query keys are forbidden.
- A feature that grows past roughly a dozen components **SHOULD** be split by sub-domain, not by
  technical type.

### 2.1 Pages are composition, nothing else

`page.tsx` and `layout.tsx` are boundaries, not workspaces.

- **MUST** limit a route file to: route params, server-side prefetch/hydration, metadata, and
  rendering one feature view.
- **MUST NOT** contain business logic, `useState`, event handlers, or a `fetch` call.
- **SHOULD** stay under 60 lines.

```tsx
// app/dashboard/products/page.tsx — the whole file
export default function ProductsPage() {
    return <ProductsView />;
}
```

## 3. Components

### 3.1 Atomic design in `packages/ui`

| Tier         | Definition                                                                    | Examples                                                  | Rules                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Atom**     | A single element with styling and no internal composition of other primitives | `Button`, `Input`, `Badge`, `Spinner`, `Label`            | Extends the intrinsic element's props, forwards `ref`, accepts and merges `className`, holds no state beyond DOM state |
| **Molecule** | A small composition of atoms with one job                                     | `Card`, `Alert`, `Pagination`, `Dialog`, `FileDropzone`   | May hold local presentational state; still knows no domain                                                             |
| **Organism** | A larger composition with internal layout and behavior                        | `DataTable`, `Chart` (arriving with the inventory portal) | Still receives all data by props                                                                                       |

- **MUST** expose variants as a typed union prop (`variant`, `size`), never as a pile of booleans.
  `<Button variant="destructive" />`, never `<Button isDestructive isLarge />`.
- **MUST** merge classes with `cn()`. String concatenation of class names is forbidden.
- **MUST** forward `ref` on any atom that wraps a focusable or measurable element.

### 3.2 Components inside a feature

Split every non-trivial feature component in two:

- **Container** (`ProductsView.tsx`): calls hooks, orchestrates, decides. Renders presentational
  components. Owns no markup beyond layout.
- **Presentational** (`ProductCard.tsx`): props in, JSX out. No hooks except pure UI ones. Trivially
  testable and storyable.

This split is what makes the testing bar in §11 cheap rather than painful.

### 3.3 Component rules

- **MUST** be one component per file, named for the file, named-exported.
- **MUST** put `'use client'` as deep in the tree as possible. Server Components are the default;
  a component becomes a Client Component only because it needs state, effects, or browser APIs.
- **MUST NOT** exceed **200 lines**. Past that, extract a sub-component, a hook, or a util. Legacy
  files above this are listed in the baseline.
- **SHOULD** take no more than 7 props. Beyond that, either the component does two jobs, or related
  props want grouping into one object, or you are drilling (see §6).
- **MUST** handle loading, empty, and error states explicitly with early returns. A list component
  that renders nothing for an empty array is a bug report waiting to happen.
- **MUST NOT** nest ternaries in JSX. Extract a variable, a lookup map, or a sub-component.
- **MUST NOT** define a component inside another component's body. It remounts on every render.
- **SHOULD** derive during render rather than storing derived values in state. `useMemo` only for
  measurably expensive work or referential stability that something depends on.

```tsx
// Bad — mirrored state, an effect to keep it in sync, three ways to be wrong
const [filtered, setFiltered] = useState<Product[]>([]);
useEffect(() => setFiltered(products.filter((p) => p.status === status)), [products, status]);

// Good — one source of truth
const filtered = products.filter((product) => product.status === status);
```

## 4. Data access

- **MUST** route all network access through `src/lib/api`. A component or feature calling `fetch`
  directly is a violation.
- **MUST** use relative `/api/v1/*` from the browser and `server.ts` (via `API_INTERNAL_URL`) from
  Server Components, per [ADR 002](../adr/002-next-bff-and-api-contracts.md).
- **MUST** parse every response with a `@inventory-system/contracts` schema. `client.ts` does this
  centrally; do not add a path that bypasses it.
- **MUST** define queries as `queryOptions` factories in `query-options.ts`, separate from the hooks
  that consume them. This is what lets a route prefetch on the server and a component subscribe on
  the client from the same definition — and it makes the query testable without React.
- **MUST** tenant-scope every query key through `tenantKeys`.
- **MUST** set `staleTime` explicitly on every query. An unstated cache policy is an accidental one.
- **MUST** pass the query function's `signal` through to the API client so navigation cancels
  in-flight requests.
- **MUST** declare invalidation on every mutation. A mutation that changes server state and does not
  invalidate or write to the cache leaves the UI lying to the user.
- **MUST NOT** copy query data into `useState`, Zustand, or `localStorage`. TanStack Query is the
  cache; a second cache is a synchronization bug.

## 5. State ownership

Restates and operationalizes [ADR 001](../adr/001-portal-state-ownership.md). Before writing any
state, find its row. If it does not have one, it needs a decision in review, not an improvisation.

| State                                                  | Owner                                | Lives in                                                     | Notes                                                          |
| ------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Server data, caching, retries, hydration               | **TanStack Query**                   | `features/<f>/query-options.ts` + `hooks.ts`                 | Tenant-scoped keys; explicit `staleTime`                       |
| Shareable list state: search, filters, status, page    | **`nuqs`**                           | The component that reads the URL                             | Defaults omitted from the URL; the URL is a deep-link contract |
| Form values, validation, submission                    | **TanStack Form + Zod**              | `features/<f>/components/*Form.tsx` via `lib/forms/app-form` | Schema comes from `contracts`                                  |
| Cross-route navigation and harmless preferences        | **Zustand** (provider-created store) | `src/state/ui-store.tsx`                                     | Only `sidebarCollapsed` is persisted                           |
| Ephemeral UI: open/closed, hover, selected file, focus | **React / Radix local state**        | The component itself                                         | Never lift it "just in case"                                   |
| Derived values                                         | **Nothing**                          | Computed during render                                       | Deriving is not storing                                        |

Hard rules:

- **MUST NOT** persist authentication state, query data, or form drafts to `localStorage`,
  `sessionStorage`, or cookies from client code.
- **MUST NOT** introduce Redux Toolkit or another global store. Query plus `nuqs` plus a thin
  Zustand store covers what this application does; a fourth owner would only create overlap.
- **MUST** access the Zustand store through a selector (`useUiStore((s) => s.sidebarCollapsed)`).
  Selecting the whole store re-renders on every unrelated change.
- **MUST NOT** grow the Zustand store into a client mirror of server data. If a new field is
  arriving from the API, it belongs to Query.
- **MUST NOT** use `useEffect` to synchronize one piece of state with another. An effect is for
  synchronizing with something _outside_ React — the DOM, a subscription, a timer, an object URL.

## 6. The prop-drilling rule

**A prop MUST NOT pass through more than one component that does not itself use it.**

Precisely: if `A` renders `B` renders `C`, and only `C` uses `value`, `A → B → C` is the maximum. The
moment a third link appears, or `B` also merely forwards it to a sibling, the design is wrong.

Fix it with the first option that works, in this order:

**1. Composition.** The usual answer, and the one people skip. Pass rendered children, not the data
they need.

```tsx
// Bad — vendor drills two layers to reach a leaf
<DashboardShell vendor={vendor}>
    <Sidebar vendor={vendor} />
</DashboardShell>

// Good — the shell takes slots and never learns what a vendor is
<DashboardShell sidebar={<Sidebar />} header={<Header />}>
    {children}
</DashboardShell>
```

**2. Call the hook where it is needed.** Server state is not drilled, it is subscribed to. Any
component may call `useCurrentVendor()` or `useProduct(id)`; TanStack Query deduplicates the request
and shares one cache entry. Threading `product` down four components to avoid "an extra call" is
optimizing the wrong thing.

**3. A feature-scoped context provider.** For state genuinely shared by one subtree and meaningless
outside it — a wizard's step, a table's selection. Provider lives in the feature, exposes a typed
hook, and throws when used outside, exactly as `useUiStore` does. Keep the value memoized.

**4. The Zustand store.** Only for state that is genuinely cross-route and outlives any one subtree.

**MUST NOT** reach for option 4 to escape drilling. Global state to fix a local structural problem
trades a visible smell for an invisible one, and it takes the testability with it.

## 7. Custom hooks

Any behavior that binds to a component's lifecycle is a hook. Any behavior that does not is a
utility (§8).

**Before writing a hook, check in this order:**

1. **A library we already ship.** `usehooks-ts` (`useDebounceValue`, `useMediaQuery`,
   `useOnClickOutside`, `useCopyToClipboard`, `useIntersectionObserver`, `useEventListener`,
   `useLocalStorage`), TanStack Query, TanStack Form, `nuqs`, Radix. Reimplementing one of these is a
   review rejection.
2. **An existing hook in this repo.** `src/hooks/`, the feature's `hooks.ts`.
3. **Only then, write it.**

Rules:

- **MUST** name it `useX` and place it by reach: one feature → `features/<f>/hooks.ts`; two or more
  features in one portal → `src/hooks/use-x.ts`; two or more portals → promote per §1.3.
- **MUST** return an object, not a positional tuple, beyond two values. `const { data, isLoading,
refetch } = useProducts()` survives additions; a 5-tuple does not.
- **MUST** obey the rules of hooks. `react-hooks/exhaustive-deps` is `error` and MUST NOT be
  suppressed — a dependency you "know" is stable either belongs in a ref or means the effect is
  wrong.
- **MUST** clean up every subscription, timer, listener, and object URL in the effect's teardown
  (`use-object-url.ts` is the reference example).
- **SHOULD** keep a hook to one concern. A hook that returns data _and_ a modal's open state is two
  hooks.
- **SHOULD NOT** wrap a single TanStack Query call in a bespoke hook that adds nothing. `useProducts`
  earns its place by binding tenancy and the `enabled` guard; a pass-through does not.

## 8. Utilities

**Any computation that is not React-aware MUST be a named, exported, pure function in a `utils/`
module.** Height, currency, formatting, parsing, sorting, mapping, date arithmetic — all utilities.

A utility is:

- **Pure.** Same input, same output. No `fetch`, no React, no module-level mutable state.
- **Injected.** If it needs the clock or randomness, it takes them as arguments so a test can pin
  them. `formatRelative(date, now)`, never a hidden `Date.now()`.
- **Single-concern.** One file per concern, named for the concern: `image.ts`, `download.ts`,
  `currency.ts`. Never `helpers.ts`, `utils.ts`, `misc.ts`, or `common.ts`.

Rules:

- **MUST** check `es-toolkit` first. `groupBy`, `uniqBy`, `chunk`, `debounce`, `pick`, `omit`, and
  `isEqual` already exist and are tested better than ours will be.
- **MUST** place by reach, like hooks: one feature → `features/<f>/utils/`; several → `src/lib/`;
  several portals → promote.
- **MUST** handle money as integer minor units plus an explicit currency code. No floating-point
  arithmetic touches money at any layer, per the
  [architecture principles](../inventory-portal-architecture.md#2-product-principles). Formatting
  utilities take `(amountMinor, currency)` and return a string; they never take a `number` of
  "dollars".
- **MUST NOT** hide I/O inside something named like a calculation.
- **SHOULD** extract any inline expression that needs a comment to be understood, or that appears
  twice.

```ts
// features/products/utils/image.ts — pure, testable, obvious
export const resolveImageUrl = (path: string | null, fallback: string): string =>
    path ? `${path}` : fallback;
```

## 9. Forms

- **MUST** use TanStack Form through `src/lib/forms/app-form`. No bespoke form state.
- **MUST** validate against the Zod schema from `@inventory-system/contracts` — the same schema the
  API validates with. Client-side rules that the server does not enforce are a security theatre and a
  drift source.
- **MUST** surface server field errors through `getFieldIssue(error, fieldName)` so a 400 from the
  API lands on the right input.
- **MUST** disable submit while submitting and render the server's error message, not a generic one.
- **SHOULD** keep field arrays (variants, versions) as field-array operations rather than hand-rolled
  index juggling.

## 10. Styling

- **MUST** use Tailwind utility classes. No CSS modules, no styled-components, no `style={{}}` except
  for genuinely computed values (a measured height, a progress percentage).
- **MUST** use `cn()` for conditional and merged classes.
- **MUST** take colors, spacing, radii, and shadows from the shared design tokens in `packages/ui`.
  A feature hardcoding a brand hex is a violation.
- **MUST** let `prettier-plugin-tailwindcss` order classes. Do not reorder by hand.
- **SHOULD** express variants through the component's `variant` prop rather than passing long
  `className` overrides from the outside. Repeated overrides at call sites mean the primitive is
  missing a variant.

## 11. Testing and Storybook

Tools: **Vitest** + **Testing Library** + **MSW**, and **Storybook 10** with `addon-vitest` for
interaction tests and `addon-a11y` for advisory auditing.

### 11.1 The bar

| Unit                                                            | Test                                          | Story                                  |
| --------------------------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| `packages/ui` component (every exported atom/molecule/organism) | **Required**                                  | **Required**                           |
| Custom hook (every one)                                         | **Required**                                  | n/a                                    |
| Utility function (every exported one)                           | **Required**                                  | n/a                                    |
| Feature presentational component                                | **Required**                                  | **Expected** — omit only with a reason |
| Feature container (`*View`)                                     | **Required**                                  | Optional                               |
| Route (`page.tsx`)                                              | **Required** — one smoke test that it renders | Not applicable                         |
| BFF route handler, API client, query client                     | **Required**                                  | Not applicable                         |

The first three rows are gated by `node tools/check-standards.mjs` and fail CI. The rest are review
responsibilities.

### 11.2 Placement

- **MUST** co-locate: `Button.tsx`, `Button.test.tsx`, `Button.stories.tsx` in the same folder.
  Co-location is what makes a missing test visible in the diff.
- Cross-cutting integration tests (BFF proxy, API client, contract round-trips) **MAY** live in
  `src/test/`. Behavior tests for a specific unit **MUST NOT**.

### 11.3 How to write tests

- **MUST** query by accessible role, label, or text — `getByRole('button', { name: 'Save' })`. Test
  IDs are a last resort for elements with no accessible handle, and using one is a hint the markup
  needs a label.
- **MUST** drive interaction with `userEvent`, never `fireEvent`. Real users do not dispatch events.
- **MUST** mock at the network boundary with MSW. **MUST NOT** mock our own modules — if a test needs
  `vi.mock('@/features/products/hooks')`, the component is too coupled to fix in the test file.
- **MUST** assert on user-observable outcomes: rendered text, submitted request bodies, called
  callbacks. Never on internal state, hook call counts, or component instances.
- **MUST** be deterministic. Fake timers for debounce and polling; no `setTimeout` sleeps; no
  dependence on test execution order or on a shared seeded fixture.
- **MUST** render through a shared `renderWithProviders` helper so every test gets a fresh
  `QueryClient` with retries disabled. A `QueryClient` shared between tests leaks cache.
- **MUST NOT** use whole-tree snapshot tests. They assert nothing and are updated reflexively. Inline
  snapshots of a small serialized value are fine.
- **SHOULD** name tests as behavior: `it('disables submit while the form is submitting')`, not
  `it('works')`.
- Each mutation hook **SHOULD** have a test proving it invalidates the keys it claims to.

### 11.4 Stories

A story file is documentation that cannot go stale, and the cheapest place to see every visual state.

- **MUST** include `Default`, plus one story per meaningful variant, size, and state — including
  loading, empty, error, and long-content overflow where they apply.
- **MUST** use `argTypes`/`args` so controls work; a story with hardcoded props teaches nothing.
- **SHOULD** add a `play` function for anything interactive, which doubles as an interaction test
  under `addon-vitest`.
- **MUST NOT** hit the network from a story. Mock with MSW at the story or meta level.
- Stories for `packages/ui` components **MUST** live beside the component in `packages/ui`, not in a
  portal. The current `apps/vendor-portal/src/stories/ui/*` files predate this rule and are
  baselined for migration.

## 12. Accessibility

The current bar is a **floor that costs nothing to hold**, not a compliance program. It is set here
deliberately low so that raising it later is a policy change rather than a rewrite.

Required now:

- Semantic elements. A `<div onClick>` that behaves like a button MUST be a `<button>`.
- Every input has a associated `<label>`; every icon-only control has an accessible name.
- Interactive elements are keyboard-reachable and show a visible focus ring (the shared `Button`
  already ships `focus-visible:ring-2`).
- Images have `alt`; decorative images have `alt=""`.
- Overlays, menus, and dialogs use Radix, which brings focus trapping and ARIA for free. Do not
  hand-roll them.

Not required yet: contrast auditing, full screen-reader passes, WCAG conformance claims. The
Storybook a11y addon runs **advisory** — violations are reported, not gated. When the product needs a
conformance level, this section is what gets rewritten.

## 13. Performance

Do not optimize speculatively; do not be careless either.

- **MUST** keep `'use client'` as deep as possible and prefetch on the server where the data is known
  at request time.
- **MUST** paginate every list surface. There is no "we will add paging later".
- **MUST** use `next/image` for images and import icons individually from `lucide-react`.
- **SHOULD** dynamically import genuinely heavy, below-the-fold widgets (charts, CSV preview).
- **SHOULD NOT** sprinkle `useMemo`/`useCallback`/`memo` by reflex. Add them for measured cost or for
  referential stability something actually depends on, and say which in a comment.

## 14. Frontend Definition of Done

- [ ] State has one owner from §5, and the URL reflects anything shareable.
- [ ] No prop passes through more than one component that does not use it.
- [ ] Feature code lives in its slice; nothing reaches into another feature's internals.
- [ ] Non-React computation is an exported pure utility; component-bound behavior is a hook — and
      neither reimplements a library we already ship.
- [ ] Every `packages/ui` component added or changed has a co-located story and test.
- [ ] Every new hook and utility has a unit test.
- [ ] Tests query by role/label, use `userEvent`, and mock only the network.
- [ ] Loading, empty, and error states are rendered, not assumed.
- [ ] Inputs are labelled and controls are keyboard-reachable.
- [ ] `npm run lint`, `npm test`, `npm run build-storybook`, and `node tools/check-standards.mjs`
      pass.
