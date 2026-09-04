# Inventory Portal Decision Log

This log records decisions that change the Inventory Portal architecture contract. The
[Inventory Portal Architecture Blueprint](inventory-portal-architecture.md) remains the
authoritative description of the current design. It continues the convention established by the
[Vendor Portal Decision Log](vendor-portal-decision-log.md).

## IPD-001 - Stock level is derived, never stored as a mutable counter

**Date:** 2026-09-03\
**Status:** Proposed

Stock is an append-only `StockMovement` ledger. `StockBalance` is a projection written in the same
transaction and rebuildable from the ledger at any time. No column anywhere is the independent
source of truth for a quantity.

**Reason:** A mutable counter cannot answer "what was stock on 14 March", cannot be audited, and
introduces lost-update races. Every analytic in this product is a fold over the ledger, so the
ledger has to exist and has to be trustworthy. The cost is one projection table and an integrity
test; the alternative costs correctness.

## IPD-002 - Cost and price are captured when they are true

**Date:** 2026-09-03\
**Status:** Proposed

Purchase cost belongs to the `StockLot` created by a specific delivery. Selling price is an
effective-dated `ItemPrice` row; a price change inserts, never updates. Cost of goods sold is
written onto the `StockMovement` and the `SalesDocumentLine` at the moment of sale.

**Reason:** Gross profit computed by subtracting today's purchase price from a historical sale is
wrong, and silently so. Capturing the figures at transaction time makes every historical margin
permanently reproducible from immutable rows.

## IPD-003 - Inventory is scoped by Organization and location, not by a new profile

**Date:** 2026-09-03\
**Status:** Proposed

Inventory data is keyed by `organizationId`, with a mandatory `stockLocationId` on everything
physical. No `InventoryProfile` analogue to `VendorProfile` is introduced.

**Reason:** `VendorProfile` exists because producer identity and organization have different
lifecycles (VPD-004). Inventory has no equivalent split — the organization is already the
legal-entity boundary that gross profit is reported against. Location is the dimension that
genuinely varies, and it is mandatory from day one because retrofitting a location key onto a
ledger and every rollup later is a migration nobody should have to run.

## IPD-004 - Both catalog-linked and supplier-only items

**Date:** 2026-09-03\
**Status:** Proposed

`InventoryItem` either wraps a Vendor Portal `ProductVersion` (`source = CATALOG`) or stands alone
against a supplier (`source = EXTERNAL`). A database `CHECK` enforces the shape. Display fields are
denormalised onto the item for both.

**Reason:** A producer stocking its own goods and a retailer stocking third-party goods are both
real customers. Denormalisation trades a small background sync job for a very large number of
avoided joins on the hot analytics path, and it means a deleted catalog record cannot orphan stock
history.

## IPD-005 - The portal records fiscal facts; it does not produce them

**Date:** 2026-09-03\
**Status:** Proposed

North Macedonia uses hardware fiscalization: certified devices with fiscal memory and a GPRS module
sign and transmit Z-reports to the UJP. This portal stores `fiscalReceiptNumber` and
`fiscalDeviceId` as references received from whatever system fiscalized the sale, and implements
none of it.

**Reason:** Fiscalization is a certified-hardware concern and belongs to the future POS portal or
the device vendor. Building it here would put a regulated, device-bound responsibility inside a
stock-management product.

## IPD-006 - e-Faktura is deferred but designed for

**Date:** 2026-09-03\
**Status:** SUPERSEDED by IPD-017 on 2026-09-04

Originally deferred e-Faktura submission while keeping the data model compatible. The product owner
has since decided e-Faktura is required in this release, and the technical premise of this entry
was wrong: it assumed an EN 16931 / UBL XML binding. See IPD-017.

## IPD-007 - PostgreSQL rollups before TimescaleDB

**Date:** 2026-09-03\
**Status:** Proposed

Analytics reads from `DailyItemMetrics` / `MonthlyItemMetrics` rollup tables refreshed incrementally
by a watermarked scheduled worker. TimescaleDB continuous aggregates are the documented escalation
path, with an explicit trigger: a full-year refresh exceeding 60 seconds, or the ledger passing 50
million rows.

**Reason:** Continuous aggregates are a genuinely better fit for this data shape, but they are an
extension that must exist in CI (currently stock `postgres:16`) and in production, and they
constrain hosting. This follows the principle already applied to search — PostgreSQL stays the
engine until measured usage justifies specialist infrastructure.

## IPD-008 - Money is integer minor units

**Date:** 2026-09-03\
**Status:** Proposed

All monetary amounts are `BigInt` minor units with an explicit `currency` column. `Decimal` is
reserved for quantities and VAT percentages. Floating point never touches money.

**Reason:** Exact by construction, sums natively in PostgreSQL, and keeps `decimal.js` out of hot
aggregation paths. `BigInt` rather than `Int` because a year of turnover in denar minor units
exceeds 32 bits. The PostgreSQL `money` type is rejected: it is locale-bound and not recommended.

## IPD-009 - POS ingest is idempotent and never rejects a real sale

**Date:** 2026-09-03\
**Status:** Proposed

Ingest idempotency is a unique constraint on `(organizationId, externalSystem, externalRef)`; a
replay returns the original document. Lines whose external code matches no item still post, and
land in a reconciliation queue. Negative stock is permitted per location and raised as a
discrepancy alert rather than an error.

**Reason:** POS systems retry, and their catalogs drift from ours. Losing revenue data because our
item mapping was stale would corrupt exactly the analytics this product is sold on. A discrepancy is
information; a rejected sale is a hole in the record.

## IPD-010 - Domain logic lives in a pure, framework-free package

**Date:** 2026-09-03\
**Status:** Proposed

`packages/inventory-domain` holds lot allocation, COGS, landed-cost allocation, price selection,
expiry bucketing, reorder suggestion, seasonality, and period boundaries as pure functions with no
Prisma, no Express, no I/O, and an injected clock. Controllers do HTTP only; services own
orchestration and transactions.

**Reason:** The catalog module currently places business logic inside controllers, which means none
of it can be tested without an HTTP request and a database. The money-critical logic in this portal
must be testable in milliseconds with table-driven tests and no mocks. This is the single highest-
value testability decision in the design.

## IPD-011 - Reconcile the `main` frontend stack before building

**Date:** 2026-09-03\
**Status:** Accepted and implemented 2026-09-04 - revises VPD-009

`main` was merged into `develop` as commit `c9e4982` and pushed. `develop` is now the single base
for all inventory work; no inventory branch should ever start from `main`.

VPD-009 made `develop` the authoritative base and excluded the divergent `main` frontend refactor.
That exclusion is now deliberately revisited: `main`'s contracts package (Zod), TanStack Query,
TanStack Form, Radix primitives, Storybook with a11y and Vitest addons, MSW, `nuqs`, and `zustand`
are ported onto `develop` in a dedicated pull request before the Inventory Portal begins.

**Reason:** VPD-009's reasoning was sound for the vendor cutover — do not reconcile an unrelated
architecture during an identity migration. That migration is now essentially done, and the
Inventory Portal is mostly tables, forms, and charts. Building it on plain fetch and hand-rolled
forms would create the weakest possible foundation for exactly the workload it has to carry, and
would leave two frontend architectures in one monorepo indefinitely.

## IPD-012 - Three closed inventory roles, not an RBAC engine

**Date:** 2026-09-03\
**Status:** Proposed

`INVENTORY_MANAGER`, `INVENTORY_STAFF`, and `INVENTORY_VIEWER`, assigned per member per location on
top of `MemberPortalAccess`. Purchase cost, margin, and financial figures are visible only to
managers, enforced at the service and serializer layer.

**Reason:** VPD-005 deferred custom job roles and named this portal as their home. A closed set of
three covers the store-manager, warehouse-worker, and read-only cases without committing to a
general permission system. Cost redaction is an authorization rule with its own test, not a UI
omission.

## IPD-013 - Charting and table libraries are wrapped, never imported by features

**Date:** 2026-09-03\
**Status:** Proposed

TanStack Table v8 (with TanStack Virtual) and Recharts are dependencies of `packages/ui` only.
Feature code imports `DataTable`, `TrendChart`, and the other organisms. Tremor is harvested as a
source of patterns under our own tokens, not added as a dependency. Apache ECharts is the
per-chart escalation for views that genuinely need canvas.

**Reason:** Headless and wrapped keeps the design system ours, centralises the palette and mark
rules so charts are correct by construction, and makes a future engine swap a change inside one
package rather than across every feature. AG Grid was rejected because the features an inventory
product would want from it are Enterprise-licensed and it brings a competing theming layer.

## IPD-014 - The mock POS adapter is a deliverable, not a test fixture

**Date:** 2026-09-04\
**Status:** Accepted

`@inventory-system/contracts` owns a `SalesIngestPayload` schema. Shipped alongside it: a pure
reference mapper, a seeded deterministic sales-stream generator, and a runnable fake till that
POSTs to the real ingest endpoint over HTTP. Real vendor adapters are additive — a new pure mapper
and an `ExternalSystem` row.

**Reason:** No POS vendor has been selected, and waiting for one would block sales, analytics, and
financials — the whole value chain. A mock that exercises the real endpoint proves the contract
before a vendor exists, supplies reproducible data to the golden-dataset test and the performance
benchmark, and gives sales something to demonstrate. Its adversarial modes (duplicate submissions,
out-of-order arrivals, unknown item codes, negative-stock sales) are the failure modes a real till
will produce, and they are far cheaper to design for now than to discover in production.

## IPD-015 - No historical backfill; analytics accrue forward

**Date:** 2026-09-04\
**Status:** Accepted

Customers are not expected to have importable prior-year data. Every analytic starts from an empty
ledger. Consequently: each metric returns a `MetricWindow` declaring whether it has enough history
to be trustworthy; the dashboard is ordered by time-to-value rather than by ambition; year-scale
panels render an explicit "needs N more weeks" progress state instead of an empty chart; and a
seeded demo organization, generated through the real ingest path, carries the mature story for
sales conversations.

**Reason:** The headline selling point — previous-year purchasing patterns — cannot produce a real
answer for roughly twelve months after go-live. That is a genuine product risk and is better stated
than discovered mid-demo. Synthetic or extrapolated history is explicitly rejected: a fabricated
trend on a screen used to commit real purchasing money is worse than no trend. The rollup schema is
year-ready from day one, so nothing is re-engineered when the history does accrue, and the ingest
payload contract doubles as the import path should a customer ever arrive with exportable history.

## IPD-016 - MKD is the ledger currency; EUR is a display lens

**Date:** 2026-09-04\
**Status:** Accepted

Every stored amount — lot cost, price, sales document, movement, rollup, period summary — is MKD
minor units. EUR exists only as a presentation-layer conversion on the dashboard, applied once to a
final total at render time, at a configured, attributed, dated rate. Converted figures are always
labelled with their rate. Financial statements of record and their CSV exports are MKD only, with
no EUR column. Multi-currency transactions and FX gain/loss remain deferred.

**Reason:** Display convenience and accounting truth are different things, and conflating them
corrupts the books. Converting per-line and then summing compounds rounding across thousands of
rows; letting a EUR figure round-trip into storage would bake a rate into history. The denar's de
facto peg to the euro makes a single current rate adequate, but a peg is policy rather than a law
of nature, so the rate is configuration with recorded provenance — never a hardcoded constant.
Exports are the artifact most likely to reach an accountant, which is exactly where an indicative
conversion does not belong.

## IPD-017 - e-Faktura is in scope, and it is signed JSON, not UBL XML

**Date:** 2026-09-04\
**Status:** Accepted - supersedes IPD-006

e-Faktura is a release requirement. It is implemented against the published UJP specification at
`efakturawiki.ujp.gov.mk`: a **proprietary JSON document signed as a JWS (RS256)** and posted to
`POST /api/v1/sales-invoices/send`, which returns an EUID, a receipt timestamp, and a `qr_link` to
be printed on the document as a QR code. Document types 100 (Фактура), 110 (Книжно одобрение),
120 (Книжно задолжение), 160 (Фактура/Испратница) and 170 (Фактура кон физичко лице) are in scope;
130 and 150 are not.

**Reason:** An earlier revision of the blueprint recorded e-Faktura as "UBL 2.1 following
EN 16931", taken from secondary commentary. That is factually wrong — there is no UBL, no XML and
no EN 16931 syntax binding in the actual UJP interface. Recording the correction explicitly matters
because the two designs share almost no implementation: a UBL serialiser, an EN 16931 mapping layer
and a Peppol-style access point would all have been wasted work. Every subsequent decision is taken
from the primary specification rather than from general European e-invoicing practice.

The e-Faktura law is still a draft under public consultation on ENER, so obligation dates are
treated as configuration rather than build-time constants.

## IPD-018 - e-Faktura is signed client-side; the platform never holds a private key

**Date:** 2026-09-04\
**Status:** Accepted

The server composes and validates the document JSON; the UJP browser extension signs it with the
user's local qualified certificate or USB token; the server relays the resulting JWS and records
UJP's response. `EInvoiceCredential` stores only public metadata — e-UJP id, tax number, certificate
serial, subject and expiry. No private key is stored, transmitted, or accessible to the platform.
`EInvoiceSigner` is an interface so an HSM-backed server signer can be added later without redesign.

**Reason:** A qualified electronic signature derives its legal meaning from remaining under the
signatory's sole control. A SaaS holding customers' qualified private keys in order to sign
unattended would undermine exactly the property the signature exists to provide, and would take on
custody liability with no corresponding benefit. UJP's own tooling signs client-side.

The accepted cost is that submission requires a human at a desktop browser with their certificate
present: there is no unattended or scheduled sending, and "awaiting signature" is a normal, visible
worklist state rather than an error.

## IPD-019 - Posting stock and issuing a faktura are separate transactions

**Date:** 2026-09-04\
**Status:** Accepted

A sale posts to the stock ledger first and unconditionally. Issuing the e-Faktura is a subsequent,
independently retryable step. The same holds on the inbound side: a goods receipt posts stock
regardless of whether its supplier invoice has been matched or accepted.

**Reason:** UJP availability, an expired certificate, or an absent signatory must never prevent the
system from recording that goods physically moved. Coupling them would mean a tax-platform outage
silently corrupts stock accuracy — the one thing every other feature is derived from. Unsent or
unmatched documents queue in a worklist instead.

## IPD-020 - Incoming invoices are matched and accepted in two explicit steps

**Date:** 2026-09-04\
**Status:** Accepted

On goods receipt the portal pulls pending incoming e-Fakturi from UJP and lets a manager match one
to the delivery. Acceptance then requires two steps: the document is re-read from UJP and displayed
line-by-line against the receipt with differences highlighted, and the manager must tick an explicit
confirmation before Accept or Reject is enabled. Rejection carries an official `O-*` reason code.
Who confirmed, when, and against which receipt is recorded.

**Reason:** On the inbound side we are the buyer; there is nothing to generate, because the supplier
already issued the document. Accepting it is a financial and tax act with real consequences, and a
one-click accept beside a list of deliveries is precisely how an incorrect invoice gets approved.
The friction is deliberate and the audit trail makes the decision reviewable.

## IPD-021 - UJP's totals arithmetic and codelists are authoritative

**Date:** 2026-09-04\
**Status:** Accepted

The domain package implements UJP's specified calculation order verbatim — notably VAT computed
**per unit and then multiplied by quantity**, not applied to the line total — with table-driven
tests over the rounding boundaries. Codelists (payment types, void/correction/reject reasons, tax
indicators, countries, currencies, document types) are synced from UJP endpoints and cached with
their validity dates; none are hardcoded. UJP status codes are stored verbatim rather than remapped.

**Reason:** The two rounding orders differ on ordinary quantities, and the intuitive one produces
documents UJP rejects for a totals mismatch with an error pointing at the amount rather than the
method. Validating against cached codelists before submission converts a remote rejection into a
local, explainable failure. Maintaining a parallel status vocabulary would guarantee drift from the
authority that actually owns the value.
