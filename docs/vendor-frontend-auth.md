# Vendor Portal frontend authentication

## Purpose

The vendor portal now treats the signed-in person, active Organization, portal entitlement, and producer-facing Vendor Profile as separate concepts. The browser uses Better Auth's secure session cookie and native client APIs; it does not persist bearer tokens or credentials.

This stage is deliberately frontend-only and depends on the Better Auth and platform-entitlement backend pull requests. Inventory roles, billing, additional portal products, and additional Vendor Profiles are not introduced here.

## Runtime context

There is no client-side auth context. Per [ADR 001](adr/001-portal-state-ownership.md) the session is
server data, so TanStack Query is its only cache:

1. `features/auth/server.ts` reads the vendor and `/api/v1/platform/context` during the server render
   of `app/dashboard/layout.tsx`, and hydrates both into the Query cache.
2. `useCurrentVendor` and `usePlatformContext` read that cache in client components.
3. `useAuthIdentity` reads the Better Auth session separately, because account-security facts
   (`emailVerified`, `twoFactorEnabled`) live in a different store than the vendor record.

The dashboard layout renders children only when the active Organization has an active Vendor Portal
subscription, effective member access, and a primary Vendor Profile. `portalAccessDenial` reports
which of the three failed, so a suspended subscription or revoked member access produces an explicit
access screen instead of repeated failing catalog requests.

## Authentication and onboarding

- Registration continues through `/api/v1/auth/register` because that endpoint creates User, credential Account, Organization, Owner membership, Vendor Portal subscription/access, and primary Vendor Profile atomically.
- Login temporarily continues through `/api/v1/auth/login` so the first successful login can upgrade a legacy bcrypt credential before the compatibility facade is removed.
- All subsequent session, Organization, email-verification, MFA, and session-management operations use the native Better Auth client.
- The login screen explains that legacy sessions were revoked and that existing passwords still work.
- Registration sends the Owner to the verification-email screen after the complete Organization graph is created.

## User-facing routes

- `/login` — session-migration-aware sign-in and MFA redirect
- `/register` — one-step Organization and primary Vendor Profile onboarding
- `/forgot-password` — enumeration-safe reset request
- `/reset-password?token=...` — reset-token validation and new password entry
- `/verify-email` — verification state and resend action
- `/two-factor` — TOTP or recovery-code sign-in challenge
- `/dashboard/settings` — Vendor Profile, email status, TOTP enrollment, recovery-code regeneration, and session revocation

## Organizations

The Organization switcher is rendered only when the User belongs to more than one Organization. Switching calls Better Auth's `organization.setActive`, then reloads the platform context. The desktop header and mobile navigation share the same switcher behavior.

## MFA and sessions

- TOTP enrollment requires the current password.
- The enrollment QR code is generated locally from the `otpauth://` URI; it is not sent to a third-party QR service.
- Recovery codes are displayed at enrollment and when explicitly regenerated. Regeneration invalidates the previous set.
- MFA can be disabled only after password reauthentication.
- Active sessions display their expiry and available device/IP context.
- The current session cannot be revoked from its own row; other sessions can be revoked individually.

## Environment

Per [ADR 002](adr/002-next-bff-and-api-contracts.md) the browser never learns the Express origin. The
portal proxies both `/api/v1/*` and Better Auth's `/api/auth/*` from its own origin, so only the
server-side variable is configured:

```env
API_INTERNAL_URL="http://localhost:4000/api/v1"
```

The Better Auth proxy target is derived from that origin. Because every auth request is same-origin,
no browser CORS allowance is required for the portal.

## Security and tenancy

- All fetches use `credentials: include`; no token is written to local or session storage.
- The frontend never infers access from navigation state. The backend platform context is authoritative.
- Organization switching refreshes subscription, member access, and Vendor Profile state before catalog content renders.
- Password reset responses do not reveal whether an email exists.
- The Vendor Profile card edits producer identity; the separate account card edits the vendor record.
- Changing an account email does not mark it verified; the settings screen keeps prompting until it is.
- The QR encoder runs in the browser, keeping the TOTP secret inside the first-party application.

## Verification

- TypeScript compilation covers the native Better Auth client contracts.
- Vitest covers the two-factor login redirect, the enumeration-safe reset confirmation, reset-password
  confirmation matching, and every branch of the portal entitlement gate.
- TOTP enrollment, recovery-code regeneration, and active-session revocation are exercised through the
  Better Auth client and are not yet covered by automated tests.
- Next production build verifies every auth and dashboard route.
- Desktop and 390×844 browser review verifies form labels, recovery routes, responsive onboarding, and console health.

## Rollback

Revert the frontend deployment to the preceding entitlement-compatible portal. Do not roll back the additive backend identity or entitlement migrations. The backend compatibility login, registration, logout, and profile contracts remain available during this stacked rollout. Users may need to sign in again after a frontend rollback, but catalog data and Organization ownership are unaffected.

## Deferred work

- Automated coverage for TOTP enrollment, recovery codes, and session revocation
- Invitation acceptance and Owner member-access management UI (next frontend PR)
- Verified account-email change
- Additional Vendor Profile creation/switching
- Billing and plan management
- Inventory roles and permissions
- Removal of the backend compatibility facade after the complete auth stack is merged and verified
