# ADR 002: Same-origin Next BFF and runtime API contracts

- Status: Accepted
- Date: 2026-08-29

## Context

Browser code previously called a public Express origin directly and trusted compile-time response interfaces. Cookie forwarding, errors, downloads, and malformed upstream responses were handled inconsistently.

## Decision

Next Route Handlers expose a fixed, same-origin `/api/v1/*` proxy. Browser requests use relative URLs. Server Components call Express directly through the server-only `API_INTERNAL_URL`, forwarding the incoming session cookie. Express remains authoritative for session creation, validation, and revocation.

The proxy forwards query strings, request bodies, cookies, request IDs, response status, `Set-Cookie`, content type, and content disposition. It rejects cross-origin mutations, never caches API traffic, only permits known API roots, and returns a normalized `UPSTREAM_UNAVAILABLE` error when Express cannot be reached.

`@inventory-system/contracts` contains Zod request and response schemas shared by Express and the portal. JSON dates are ISO strings. Public JSON responses use one discriminated envelope:

- Success: `{ success: true, data, message?, meta? }`
- Failure: `{ success: false, message, code, statusCode, requestId?, issues? }`

## Consequences

The browser no longer depends on `NEXT_PUBLIC_API_URL`. API payloads are checked at runtime, field issue paths survive transport, binary/FormData paths use the same client boundary, and an expired session is handled centrally through Query rather than hard navigation.
