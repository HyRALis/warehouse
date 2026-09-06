# Vendor Portal review and correction checkpoint

Reviewed 2026-09-06. This is a resumable implementation checkpoint, not release approval.

## PR reconciliation

PRs #16–#22 include the current `develop` history and were reported mergeable by GitHub on
2026-09-06. All seven CI verification jobs passed. No PR was merged automatically. The original
worktree and the unfinished historical Stage 10 worktree were preserved. Reconciliation retained
the frontend architecture already inherited through the PR/develop history; no new work on `main`
was undertaken.

Frontend review restored the product, version, catalog, template-duplication and import workflows
on the shared contracts/TanStack architecture. Follow-up fixes cover pending search timer cleanup,
keyboard focus, mobile navigation, floating Quick Create, and populated search accessibility.
PR #21 passed 108 component tests locally. Its dependent PR #22 passed 119 component tests, five
desktop/mobile browser checks, lint, Next and Storybook builds. The five committed screenshots
were regenerated and visually reviewed. These preview checks are not authenticated release flows.

## Backend correction: protect the last Owner under concurrency

**Problem and rationale.** Better Auth's existing before-change hooks count owners and provide
friendly rejection messages, but the subsequent mutation is separate. Two owners can both pass
that count and concurrently remove/demote each other. The invariant must also cover cascaded user
deletion and future membership mutation entry points.

**Implementation.** Migration `20260906123000_protect_last_organization_owner` installs a trigger on
membership deletion and role/organization changes. Losing an owner updates the parent organization
row without changing its name, then verifies that another owner remains. This serializes competing
losses for that organization. The row update, rather than only a lock, also makes stale Repeatable
Read or Serializable transactions abort. The existing application checks remain for normal
user-facing errors; a race rejected at the database boundary may return the generic failed-operation
response and requires refreshing the membership list before retrying.

This follows PostgreSQL's documented [transaction isolation behavior](https://www.postgresql.org/docs/current/transaction-iso.html)
and [VOLATILE function snapshot rules](https://www.postgresql.org/docs/current/xfunc-volatility.html).
Only owner-loss operations acquire the guard; ordinary catalog operations are unaffected. Role
tokens are matched exactly, including comma-separated owner/member roles. Explicit organization
deletion may cascade after the parent disappears; native organization deletion remains disabled,
and vendor-profile foreign keys still restrict it.

**Migration and rollback.** No columns, records, credentials or identifiers are removed or rewritten.
Deploy the migration before relying on concurrent owner protection. Existing organizations are not
backfilled or assigned new owners. On an isolated recovery copy, the guard can be removed with:

```sql
DROP TRIGGER member_protect_last_owner ON "member";
DROP FUNCTION protect_last_organization_owner();
```

Removing it restores the original race. Do not remove this guard from a serving database unless
owner/member mutations have been disabled and a replacement protection is ready. Never edit an
applied migration; any production reversal must be a new reviewed migration.

## Backend correction: tenant-safe shared taxonomy usage

**Problem.** A category or template can legitimately be system-owned while its related products and
custom categories belong to many vendors. Filtering the parent row alone exposed aggregate usage
from other profiles, even though the current frontend parser did not display those extra fields.

**Implementation.** Category product counts now include only non-deleted products of the current
Vendor Profile. Child counts include only system and current-profile categories. Template category
counts apply the same visibility predicate in both list and detail reads. The category-list path
is extracted into a service and repository without changing HTTP routes or response field names.
No search ranking, indexing or optimization is included.

**Rollback.** Reverting the count changes would restore aggregate information leakage and is not
recommended. There is no data migration to undo. A corrective forward patch is preferable.

## Backend verification

- 83 API tests passed; API and Prisma database builds passed.
- 11 local PostgreSQL migration/review tests passed, none skipped. The harness creates uniquely
  named disposable databases, rejects non-local URLs in local mode, and removes only those databases.
- Clean migration, repeated seeds, legacy credential migration and vendor/catalog ownership backfill
  passed alongside the new migration.
- Six simultaneous owner-loss scenarios passed: removal and demotion at Read Committed, Repeatable
  Read and Serializable isolation. Each retained one owner. User-deletion cascades, membership moves,
  bulk deletion rollback and valid owner succession were also checked.
- Real repository queries verified counts with multiple organizations, an additional profile in the
  same organization, shared taxonomy, private children/templates, and soft-deleted products.
- Standards check passed without extending its baseline.
- Production audit passed the configured high-severity threshold, but reported three moderate
  findings through `qs`/`body-parser`/`express`. This is not a zero-vulnerability claim.

## PR mapping and remaining release gates

The backend corrections belong to `codex/backend-vendor-review-corrections`, based on PR #19 and
targeting `develop`. It contains backend, migration, tests and documentation only. Merge after #19;
frontend work remains in #20–#22 and any separate frontend review follow-up.

The following require further implementation or acceptance evidence before release:

1. Separate vendor display edits from person/account email and organization naming. The compatibility
   settings endpoint currently couples these identities; email changes must use the verified auth flow.
2. Make organization switching and invitation acceptance recover safely from partial success and
   prevent actions through stale tenant context.
3. Finish image deletion/cover consistency and shared-object deletion-race review, plus live-storage
   regression evidence. Upload rollback has tests; it is not proof of every deletion path.
4. Dependency follow-up: the three moderate findings are resolved on the separate
   `codex/backend-vendor-dependency-security` branch. See [parser security evidence](vendor-parser-security.md)
   for the patched runtime, npm workspace-override correction and clean-install verification.
5. Finish authenticated browser flows (including MFA, invitations, revocation and suspension),
   manual accessibility checks and the measured search acceptance corpus. Do not over-optimize search.
6. Reconcile final release documentation and the canonical Google Docs-ready DOCX, render every page,
   and check content parity. This checkpoint does not regenerate or certify the DOCX.

Inventory schemas, workflows, dependencies and the separate inventory task remain deferred until
the vendor release is complete and its release PR has been reviewed and merged.
