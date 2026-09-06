# Vendor Portal Decision Log

This log records decisions that change the Vendor Portal completion contract. The implementation blueprint remains the authoritative description of the current design.

## VPD-001 - Finish Vendor Portal before Inventory Portal

**Date:** 2026-09-01\
**Status:** Accepted

The current implementation run ends with a release-ready Vendor Portal. No Inventory Portal schema, API, UI, operation, or dependency is implemented in this chat. Inventory work begins in a separate chat after the vendor release is merged.

**Reason:** Finishing and stabilizing the existing portal reduces simultaneous product and platform change and provides a trusted identity foundation for later portals.

## VPD-002 - Upgrade Prisma before replacing authentication

**Date:** 2026-09-01\
**Status:** Accepted

Upgrade Prisma 5 to Prisma 7 in an isolated backend pull request before Better Auth models or migrations are introduced.

**Reason:** Prisma 7 changes client generation, ESM configuration, PostgreSQL adapters, environment loading, pooling, and seeding. Isolating the upgrade makes regressions and rollback reviewable.

## VPD-003 - Organizations own portal subscriptions

**Date:** 2026-09-01\
**Status:** Accepted

A User belongs to an Organization. The Organization owns subscriptions to application portals. Member Portal Access controls which members may enter each subscribed portal.

**Reason:** The same Organization may later subscribe to Vendor, Inventory, Purchasing, or fiscal/POS products without conflating any portal-specific domain with the Organization.

## VPD-004 - Vendor Profile is not the Organization

**Date:** 2026-09-01\
**Status:** Accepted

Vendor Portal catalog data belongs to a Vendor Profile owned by the Organization. The schema supports profile keys, but the service permits only one `primary` profile in this release.

**Reason:** Producer identity and Organization ownership have different lifecycles. The profile boundary preserves future multi-profile options without introducing profile switching now.

## VPD-005 - Owner and portal access now; custom roles later

**Date:** 2026-09-01\
**Status:** Accepted

The Vendor release supports Owner and Member memberships, invitations, and per-member Vendor Portal access. Custom job roles and granular inventory permissions are deferred.

**Reason:** Owners need to delegate Vendor Portal access now, while role semantics such as store manager, regional manager, cashier, and warehouse worker belong to later portal requirements.

## VPD-006 - Entitlements before billing

**Date:** 2026-09-01\
**Status:** Accepted

Organization Portal Subscription represents access state only. Payment plans, checkout, invoices, taxes, renewals, and payment-provider integrations are deferred.

**Reason:** Portal access is required for authorization now; billing is a separate product and compliance concern.

## VPD-007 - Migrate accounts and require reauthentication

**Date:** 2026-09-01\
**Status:** Accepted

Existing accounts, email addresses, and passwords are preserved. Legacy sessions and reset tokens are invalidated. The first successful login accepts the existing bcrypt hash and upgrades it to the new policy.

**Reason:** This avoids forced password resets without operating two session systems during a long compatibility window.

## VPD-008 - Backend-first, separate frontend pull requests

**Date:** 2026-09-01\
**Status:** Accepted

Schema, migrations, contracts, services, authorization, and API tests merge before their dependent frontend workflows. Frontend pull requests consume accepted contracts and contain no backend business rules.

**Reason:** Smaller capability pull requests are easier to review, test, explain, and resume with limited context.

## VPD-009 - Develop is the authoritative release base

**Date:** 2026-09-01\
**Status:** Accepted

All Vendor Portal completion branches start from the `develop` history. The divergent `main` frontend refactor is excluded from this release and may be evaluated separately later.

**Reason:** The Vendor Portal stages are already merged into `develop`; keeping one implementation base avoids an unrelated architecture reconciliation during the Prisma and identity cutover.

## VPD-010 - Remove the legacy system while retaining stable auth URLs temporarily

**Date:** 2026-09-03\
**Status:** Accepted

The final backend cleanup removes the Vendor table, handwritten JWT/session implementation,
legacy credential fields, compatibility triggers, and transitional catalog ownership columns.
The established `/api/v1/auth` URLs remain temporarily as thin Better Auth-backed routes until
the stacked frontend authentication branch replaces every caller.

**Reason:** The security and data-model cutover should complete now, but deleting routes still
used by an open dependent frontend branch would create a known broken stack. Retaining stable URLs
does not retain the legacy authentication implementation or duplicate session state.

## VPD-011 - Enforce owner retention and aggregate tenancy at persistence boundaries

**Date:** 2026-09-06\
**Status:** Implemented on the backend review-corrections branch; pending PR review

Application owner-count checks remain for friendly errors, with a database trigger serializing
owner loss to prevent concurrent demotion/removal from leaving an organization without an Owner.
Counts on system categories and templates are scoped to the requesting profile's visible relations,
not to the global usage of the shared record.

**Reason:** Separate preflight checks cannot guarantee concurrent invariants, and shared parent-row
visibility does not authorize disclosure of other vendors' related records. See the
[review checkpoint](vendor-review-2026-09-06.md) for rationale, PostgreSQL tests, rollback and remaining gates.
