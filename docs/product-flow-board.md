# OmniStock product flow board

Working board: [Auth, Vendor & Inventory Flows](https://www.figma.com/board/oQWHAnuhcW4GxNg2xktX92).

Reviewed 2026-09-05. This document is the source checklist for the editable board. Current means
present in the inspected code, not a claim that the deployed environment has passed end-to-end QA.
Inventory is planned. Own POS follows inventory. Open decisions are not accepted requirements.

**Revision 2:** [Start with the simplified inventory journeys](https://www.figma.com/board/oQWHAnuhcW4GxNg2xktX92?node-id=7-682).
The board now includes shorter worker journeys, a proposed worker access matrix and a separate
validation/approval section. Prior inventory sections are labeled REFERENCE V1; their older role
labels are superseded. Auth/vendor flows remain current. See the
[UX and permissions proposal](inventory-ux-and-permissions.md) and IPD-031. Exact job-preset grants
await founder examples. Prompts 00/01 preserve their originals with dated appended modification
instructions; prompts 02–07 and their README incorporate the revision directly.

## Auth: current implementation

- Vendor registration creates the owner organization and vendor profile, sends verification email,
  and routes to `/verify-email?sent=1`. Resending verification is available after sign-in.
- Email verification is not currently a hard login gate (`requireEmailVerification: false`).
- Sign-in: credentials -> optional authenticator/recovery-code challenge -> organization context ->
  active subscription, member access and vendor profile checks -> dashboard or specific denial.
- Organization switching invalidates cached queries and rechecks access.
- Recovery: email -> neutral reset confirmation -> link -> valid token and matching passwords ->
  reset success. Failed/expired links need a fresh request.
- Security settings: enroll in two-factor authentication, save backup codes, inspect/revoke sessions.
  Sign-out clears portal query state and returns to login.
- Invitation support exists on the backend, but `/accept-invitation` was not found among app routes.
  Treat the complete acceptance journey as unfinished until implemented and verified.
- Inventory-only registration, inventory entitlement and location-role routing remain planned.

Sources: `packages/api/src/auth.ts`, `packages/api/src/routes/platform.routes.ts`,
`apps/vendor-portal/src/features/auth/queries.ts`, `features/auth/components/VerifyEmailView.tsx`,
`features/auth/components/TwoFactorForm.tsx`, `features/auth/utils/portal-access.ts`,
`apps/vendor-portal/src/app/dashboard/layout.tsx`.

## Vendor catalog: current implementation and intended refinements

- Dashboard -> product list -> create -> name/category, optional SKU/barcode, status,
  characteristics and media -> validate -> create -> product list.
- The current create form offers explicit **Load from template**. Category-triggered autofill and
  moving templates into an advanced area are intended refinements, not current form behavior.
- Product creation succeeds before image upload. If upload fails, retry the image on the existing
  product or continue without it; do not create another product. Those recovery actions open detail.
- Product detail -> manage sellable versions -> identifiers/media/status -> select primary version.
  Versions represent editions; they are not inventory lots or a revision log.
- Categories and templates: browse system/private resources; use private copies for customization.
- Search -> product/category/template -> relevant detail.
- Bulk: choose CSV (up to 5 MB) -> start import -> imported product/version counts and failed rows ->
  fix failures. Export downloads the catalog. Current bulk UI does not have a pre-import preview.
- Catalog publication describes items; receiving physical goods belongs to inventory.

Sources: `apps/vendor-portal/src/features/products/components/ProductCreateView.tsx`,
`apps/vendor-portal/src/components/ProductVersionManager.tsx`,
`apps/vendor-portal/src/features/bulk/components/BulkOperationsView.tsx`,
`docs/vendor-portal-decision-log.md` (intended UX).

## Inventory: planned launch flows

### Setup and opening inventory

Organization/access -> locations and worker permissions -> catalog selection or local item -> opening
draft/import -> quantity, lots, expiry, purchase costs and sale prices -> validation/preview ->
saved progress -> confirm cutover -> post once as `OPENING_STOCK`.

Missing purchase cost blocks posting. Missing selling price blocks release for sale. Opening
inventory is distinct from a current-period purchase and does not invent historical sales.

### Receiving and pricing

Supplier delivery -> scan items and enter quantity/cost on one receipt -> confirm displayed approved
price reuse inline -> Receive stock. Server checks and posting remain internal steps. Missing prices
create an authorized worklist task; those goods stay on hand but unavailable for sale.

Example: 200 milk cartons for a total of 12,000 MKD gives 60 MKD each. Total cost is authoritative;
the system retains exact residual minor units when division is uneven. Blank cost is not zero.

The proposed receiver preset can enter receipt costs and post complete receipts at allowed
locations. Price changes, posted-cost corrections, valuation/margins and exports use separate grants;
other warehouse jobs do not inherit receipt-cost access. Viewers have stock/expiry read access only.

Manager changes price -> explicitly choose this batch or all batches of the item -> preview affected
locations, quantities and prices -> confirm. Historical sales are preserved. Batch-only changes do
not silently change the default price offered for future receipts.

### Availability, rotation and sale

Location setting -> FIFO (earliest received), FEFO (earliest expiry), or manual -> eligible lots.
Held, damaged and expired stock is excluded. Recommended picking and actual picking are distinct.
Different batch prices require a batch label/code or explicit selection, even with FIFO/FEFO enabled.

Select item/batch/quantity -> confirmed price AND sufficient available sellable quantity? -> no:
block with a specific reason; yes: atomic authorization/reservation -> post sale once -> movements
and analytics. Concurrent checkouts must not consume the same availability.

### Corrections, returns and unusable stock

| Trigger | Flow and result |
| --- | --- |
| Cancel draft purchase | Cancel draft; no stock movement |
| Reverse posted receipt | Check goods already sold/transferred; append linked reversal or resolve dependencies |
| Correct posted cost/sale | Select original, enter reason and changes; retain original with linked correction |
| Customer return | Link original sale/quantity; inspect condition; sellable restock or hold; credit is separate |
| Supplier return | Linked outbound stock movement; separate financial adjustment |
| Damaged/spoiled/dysfunctional item | Hold from sale; review disposition; authorized write-off |

Record actor, reason, effective time and recorded time. A financial credit does not prove goods
physically returned. A price correction alone does not move goods.

### Invoicing and analytics

Outgoing: posted sale -> invoice draft -> validate -> awaiting browser certificate signature ->
submit -> accepted, rejected or retry worklist. Submission is independent from physical stock posting.

Incoming: match invoice to delivery -> refresh and compare lines -> explicit manager confirmation ->
accept or reject with an official reason. Never silently accept a matched invoice.

Stock/expiry, sales/revenue and costed gross margin work from the first recorded facts. Label partial
coverage and unknown valuation. Forecasts are later work; annual comparisons require matching history.

Sources: `docs/inventory-portal-architecture.md`, `docs/inventory-portal-decision-log.md` IPD-017 to
IPD-030. Later decisions supersede conflicting open questions in earlier entries.

## Later: own POS and fiscal printer

Authorized/reserved sale -> local fiscal bridge -> printer outcome -> confirmed: finalize once;
unknown: durable recovery queue. Do not blindly issue another receipt or release stock when outcome
is uncertain. Prove one device/firmware early; implement checkout after inventory.

## Decision parking lot

1. VAT-inclusive/exclusive cost entry and deliberate free-stock handling.
2. Financial costing method, separate from physical FIFO/FEFO picking.
3. Policy for corrections affecting already-exported periods.
4. First fiscal printer/firmware, bridge approach and access to a test device.
5. Offline checkout policy and payment/fiscal recovery.
6. Batch labeling and cashier choice when batches have different prices.
7. Transfer/in-transit semantics and count-versus-movement conflicts.
8. Inventory-only signup and the missing invitation acceptance route.

For each flow review, capture actor, trigger, required information, success, error/recovery,
permissions and acceptance criteria. Record decisions in the appropriate decision log before
updating the board's planned behavior.
