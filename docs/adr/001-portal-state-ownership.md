# ADR 001: Portal state ownership

- Status: Accepted
- Date: 2026-08-29

## Context

The portal previously mixed API data, authentication, forms, filtering, and transient UI state inside page components. That made ownership unclear and created duplicated fetch and synchronization logic.

## Decision

- TanStack Query owns remote data, caching, cancellation, retries, SSR hydration, and mutation invalidation. Query keys are tenant-scoped.
- `nuqs` owns shareable product search, status, and page state. Defaults are omitted from URLs.
- TanStack Form with Zod contracts owns form values and validation. Dynamic rows use field-array operations.
- A provider-created Zustand store owns only cross-route navigation state and harmless preferences. Only sidebar collapse is persisted.
- React and Radix own ephemeral state such as dialog visibility and selected files.

Authentication, query data, and form drafts must not be persisted in browser storage. Redux Toolkit is not introduced because it would overlap with Query and the portal has little event-driven client state. TanStack Store remains deferred while it is not a stable production foundation.

## Consequences

Pages are server-oriented composition boundaries. Features own query factories, hooks, forms, utilities, and UI. New state must be assigned to one owner before implementation, avoiding mirrored state and synchronization effects.
