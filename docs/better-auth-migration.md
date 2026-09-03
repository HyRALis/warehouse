# Better Auth identity migration and rollback

## Scope

This stage replaces the Vendor Portal's handwritten JWT sessions with Better Auth 1.7 and
adds the identity structures required for organization membership. It is deliberately additive:
the legacy `Vendor` remains the catalog tenancy context until the following entitlement and
Vendor Profile migration. The temporary `/api/v1/auth` facade keeps the current portal contract
working while the frontend is migrated.

## Identity model

- `User` is the authenticating person.
- `Account` stores the email/password credential. New passwords use the application scrypt
  policy; migrated bcrypt hashes remain valid until their first successful login.
- `Session` is a revocable, database-backed Better Auth session. The browser receives only an
  HttpOnly, SameSite cookie, never a bearer token in the compatibility response.
- `Organization` and `Member` establish Owner and Member relationships.
- `Invitation` is the only way a non-owner can use native email/password signup. Direct native
  signup without a valid, unexpired invitation is rejected.
- `Verification` holds Better Auth verification and reset records.
- `TwoFactor` holds encrypted TOTP configuration, encrypted recovery codes, failed-attempt
  counters, and lockout state.

Registration through `/api/v1/auth/register` creates the legacy Vendor, User, credential
Account, Organization, and sole Owner membership in one serializable transaction. It then asks
Better Auth to create the database session. Organization deletion and user-created additional
organizations are disabled for this release. Only `owner` and `member` roles are accepted, and
the final Owner cannot be removed or demoted.

## Existing-data cutover

Migration `20260901204932_better_auth_identity` performs these operations in one PostgreSQL
transaction:

1. Abort if legacy emails contain case-insensitive duplicates, then normalize emails to lowercase.
2. Create the Better Auth identity, organization, invitation, and TOTP tables.
3. Create one User, credential Account, Organization, and Owner Member per legacy Vendor.
4. Copy each bcrypt password hash without re-encoding it.
5. Mark migrated emails verified because the legacy schema had no email-verification state and
   all records were already admitted accounts.
6. Invalidate legacy reset tokens.
7. Copy no legacy sessions, forcing every existing user to authenticate again.
8. Verify backfill counts before committing.

Run the post-migration audit after deployment:

```sh
npm run auth:verify-migration --workspace @inventory-system/database
```

The command fails unless Vendor, migrated User, credential Account, Organization, and Owner
counts match and every legacy reset token is cleared.

## Password transition

New and reset passwords use scrypt with `N=32768`, `r=8`, `p=1`, a random 16-byte salt, and a
64-byte derived key. On successful login, the compatibility facade recognizes an existing bcrypt
hash and replaces only that Account credential with the current scrypt representation. Invalid
credentials always receive the same response, and credential lookup happens only after Better
Auth has completed password verification.

The old Vendor credential fields and JWT code are intentionally retained in this stage. They are
removed only after the frontend uses Better Auth and the migration audit has passed.

## Email, proxy, and cookie configuration

Set a dedicated `BETTER_AUTH_SECRET` of at least 32 random characters and the public API origin in
`BETTER_AUTH_URL`. Local development may use `AUTH_EMAIL_MODE=log`; this records only safe event
metadata and never a token or link. Use `AUTH_EMAIL_MODE=smtp` with `AUTH_EMAIL_FROM`, `SMTP_HOST`,
and the optional SMTP credential pair when delivery is required.

Configure `AUTH_CLIENT_IP_HEADER` only when a trusted reverse proxy overwrites the named header.
Use `cf-connecting-ip` behind Cloudflare or `x-real-ip` behind a trusted proxy configured to strip
client-supplied values. Leaving it unset avoids trusting arbitrary forwarding headers. Better Auth
uses the resulting address for session metadata and rate limiting.

Production cookies are Secure, HttpOnly, and SameSite. `CORS_ORIGINS` must list only the portal
origins that may send credentialed requests.

## Verification

The database integration suite applies the pre-auth migration history to PostgreSQL 16, inserts a
representative uppercase-email legacy Vendor with a cost-12 bcrypt credential and reset token,
then deploys the identity migration and checks every backfill and invalidation rule.

The API smoke test verifies:

- uninvited native signup is rejected;
- compatibility registration creates a session with an active organization;
- the organization contains exactly one Owner and that Owner cannot be removed;
- an Owner can issue a Member invitation;
- TOTP setup returns an authenticator URI and ten recovery codes;
- disabling TOTP rotates the database session;
- session listing works; and
- deactivating the Vendor revokes the Better Auth session.

Unit tests cover the compatibility facade, generic credential failures, first-login bcrypt
rehashing, reset delegation, logout, missing database sessions, and the scrypt/bcrypt policy.

## Rollout

1. Back up PostgreSQL and record the pre-deployment migration state.
2. Deploy the schema migration while the old application is not accepting writes.
3. Run `auth:verify-migration` and compare the reported count with the expected Vendor count.
4. Deploy the API with the dedicated Better Auth secret, public URL, CORS, email, and trusted-proxy
   settings.
5. Confirm an existing bcrypt account can sign in, is asked to authenticate again, and receives a
   database session.
6. Keep the compatibility facade until the frontend-auth pull request is deployed.

## Rollback

Before new Better Auth accounts or invitations are accepted, application rollback is safe: stop
the new API, redeploy the previous application, and leave the additive tables in place. Legacy
password hashes remain unchanged in `vendors`; users will still need to sign in again because old
sessions and reset tokens were intentionally invalidated.

After new registrations, password resets, password rehashes, invitations, or MFA enrollment have
occurred, do not drop the new tables or blindly redeploy the old authentication service. Restore
the pre-cutover database backup or perform an audited forward repair. The SQL migration has no
automatic down migration because removing identity records would be destructive.

