<!--
Standards: docs/standards/README.md · frontend.md · backend.md
Delete the section that does not apply. Keep the checklists honest — an unchecked box with a
one-line reason is fine; a checked box that is not true is not.
-->

## What and why

<!-- What changed, and the problem it solves. Link the Linear issue: OMN-___ -->

## How to verify

<!-- The steps a reviewer takes to see this working. -->

## Risk and rollout

- Migrations: <!-- none, or the migration name + rollback note -->
- New environment variables: <!-- none, or the names, also added to .env.example -->
- New or changed API error codes: <!-- none, or the codes -->
- Breaking changes to `packages/contracts`: <!-- none, or what and who consumes it -->

---

## Checklist — all changes

- [ ] One concern; no refactor mixed with a behavior change.
- [ ] `npm run build`, `npm test`, `npm run lint`, and `npm run standards:check` pass locally.
- [ ] No new entries in `tools/standards-baseline.json`. (If a baselined file was touched, the
      touched path was fixed and its entry removed.)
- [ ] No `any`, no non-null assertions, no swallowed errors, no commented-out code.
- [ ] Every `TODO` carries an issue key: `TODO(OMN-123)`.

## Checklist — frontend

- [ ] State has one owner from [frontend.md §5](../docs/standards/frontend.md#5-state-ownership);
      nothing mirrors server data.
- [ ] No prop passes through more than one component that does not use it.
- [ ] Feature code lives in its slice; nothing reaches into another feature's internals.
- [ ] Non-React computation is a pure utility; component-bound behavior is a hook — and neither
      reimplements `es-toolkit`, `usehooks-ts`, TanStack, `nuqs`, or Radix.
- [ ] Every `packages/ui` component added or changed has a co-located story **and** test.
- [ ] Every new hook and utility has a unit test.
- [ ] Loading, empty, and error states are rendered.
- [ ] Inputs are labelled; interactive elements are keyboard-reachable.

## Checklist — backend

- [ ] Layering respected: no Prisma outside repositories, no Express in services, no business logic
      in controllers.
- [ ] Every tenant-owned query is scoped **in the query**, with `deletedAt: null` where applicable.
- [ ] Request/response schemas live in `packages/contracts`, are `.strict()`, and bound `limit`.
- [ ] Responses use the success/error envelope; nothing internal leaks to the client.
- [ ] Async handlers are wrapped; multi-write use cases run in a transaction.
- [ ] New filter/sort columns are indexed.
- [ ] Tests cover: happy path, 401, 400 with issue paths, **cross-tenant 404**, and each denied role.
