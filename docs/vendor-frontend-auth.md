# Vendor Portal frontend authentication

## Purpose

The vendor portal now treats the signed-in person, active Organization, portal entitlement, and producer-facing Vendor Profile as separate concepts. The browser uses Better Auth's secure session cookie and native client APIs; it does not persist bearer tokens or credentials.

This stage is deliberately frontend-only and depends on the Better Auth and platform-entitlement backend pull requests. Inventory roles, billing, additional portal products, and additional Vendor Profiles are not introduced here.

## Runtime context

`AuthProvider` resolves client state in this order:

1. Read the Better Auth session.
2. List the person's Organization memberships.
3. Read `/api/v1/platform/context` for the active Organization.
4. Expose the authenticated User, Organization list, subscription/access state, and primary Vendor Profile.

The dashboard renders only when the User is authenticated and the active Organization has an active Vendor Portal subscription, effective member access, and an active primary Vendor Profile. A suspended subscription or revoked member access produces an explicit access screen instead of repeated failing catalog requests.

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

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
```

If `NEXT_PUBLIC_API_ORIGIN` is omitted, the portal derives it by removing `/api/v1` from `NEXT_PUBLIC_API_URL`. Production values must match the backend Better Auth base URL and allowed CORS origin.

## Security and tenancy

- All fetches use `credentials: include`; no token is written to local or session storage.
- The frontend never infers access from navigation state. The backend platform context is authoritative.
- Organization switching refreshes subscription, member access, and Vendor Profile state before catalog content renders.
- Password reset responses do not reveal whether an email exists.
- Account email editing remains disabled until a verified change-email policy is implemented.
- The QR encoder runs in the browser, keeping the TOTP secret inside the first-party application.

## Verification

- TypeScript compilation covers the native Better Auth client contracts.
- Vitest covers session hydration, Organization switching, MFA routing, TOTP enrollment, recovery codes, and active-session controls.
- Next production build verifies every auth and dashboard route.
- Desktop and 390×844 browser review verifies form labels, recovery routes, responsive onboarding, and console health.

## Rollback

Revert the frontend deployment to the preceding entitlement-compatible portal. Do not roll back the additive backend identity or entitlement migrations. The backend compatibility login, registration, logout, and profile contracts remain available during this stacked rollout. Users may need to sign in again after a frontend rollback, but catalog data and Organization ownership are unaffected.

## Deferred work

- Invitation acceptance and Owner member-access management UI (next frontend PR)
- Verified account-email change
- Additional Vendor Profile creation/switching
- Billing and plan management
- Inventory roles and permissions
- Removal of the backend compatibility facade after the complete auth stack is merged and verified
