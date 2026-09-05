# Inventory Portal Architecture Blueprint

**Status:** Proposed; awaiting approval before PR 00\
**Reviewed:** 2026-09-05\
**Primary audience:** Store managers, warehouse managers, and the owners who plan their purchasing\
**Repository baseline:** `develop` (Prisma 7, Better Auth, portal entitlements), plus the reconciled `main` frontend stack\
**Depends on:** [Vendor Portal Implementation Blueprint](vendor-portal-implementation-plan.md), [Vendor Portal Decision Log](vendor-portal-decision-log.md)

## 1. Executive summary

The Inventory Portal is the second product on the OmniStock platform. It reuses the User,
Organization, portal-subscription, and member-access foundation built for the Vendor Portal
(VPD-003 through VPD-006) and adds an inventory domain of its own.

The first adoption hurdle is getting an existing store set up accurately with minimal effort.
The release must make opening inventory, daily receiving, sales, corrections and invoicing easy
and reliable. **Analytics are useful from the first transactions:** what sold, what it earned,
and what is about to expire. Purchasing suggestions and historical comparisons gain coverage as
history accumulates; customers do not wait a year for useful analytics.

That single fact drives the whole design. Analytics quality is a function of the fidelity of the
underlying events, so the core of this system is an **append-only stock movement ledger** with cost
and price captured at the moment they were true. Current stock, margin, and reports are projections
of stock movements, sales facts and linked value corrections, never independently maintained numbers.

Five capabilities define the release:

1. Complete opening inventory and multi-location stock with lot/batch tracking and expiry dates.
2. Receiving with mandatory purchase cost, including bulk-total entry, and confirmed selling prices.
3. Sales captured from two sources — manual entry in the portal and the future OmniStock POS —
   normalised into one sales-document model that covers both fiscal receipts and invoices
   (фактури).
4. An analytics and gross-profit layer over daily, monthly, quarterly, and yearly rollups.
5. e-Faktura at launch, plus purchase/sale corrections, returns and damaged/spoiled stock handling.

## 2. Product principles

- **The ledger is the truth.** Stock level is a derived value. No mutable quantity column is ever
  the source of truth.
- **Facts are captured when they happen.** Purchase cost belongs to the delivery. Selling price is
  effective-dated. Cost of goods sold is recorded on the sale, not recomputed later from today's
  prices.
- **Corrections are entries, not edits.** Nothing in the ledger is updated or deleted; mistakes are
  fixed with linked quantity or value corrections that keep the audit trail intact. A cost-only or
  price-only correction must not fabricate physical stock movement.
- **Cost precedes receipt posting; price precedes selling.** A draft can be incomplete. Opening
  stock and received stock require an entered purchase cost before posting; a batch is available
  for new sales only when a selling price has been confirmed. Completed fiscal outcomes recovered
  remain recordable as exceptions (§6.2).
- **A manager sees a decision, not a table.** Every analytics screen answers a question a person
  actually asks: what should I reorder, what is about to spoil, what made money.
- **Money is exact.** All amounts are integer minor units with an explicit currency. No floating
  point touches money at any layer.
- **Periods are computed in the organization's timezone.** "Sold today" is meaningless otherwise.
- **The portal consumes fiscal facts; it does not produce them.** Hardware fiscalization is a
  certified-device concern and stays outside this portal.
- **Domain logic is pure and framework-free.** Allocation, costing, margin, and forecasting are
  plain functions with no database and no HTTP, so they are trivially testable.
- **Every query and mutation is scoped by Organization, then by location.**
- **PostgreSQL remains the analytics engine** until measured usage justifies otherwise, matching
  the search decision already made for the Vendor Portal.

## 3. Scope

### Included

- Stock locations (warehouses and stores) with per-location stock.
- Guided opening-stock setup/import: all existing items, quantities, lots, expiry, purchase costs,
  selling prices and location holdings, with preview, saved progress and cutover reconciliation.
- Inventory items that either wrap a Vendor Portal `ProductVersion` or stand alone against a
  supplier.
- Suppliers, goods receipts, mandatory per-delivery purchase cost entered per unit or as the total
  for the received quantity of one item, and landed-cost allocation.
- Stock lots with expiry dates, expiry reporting per item and per delivery.
- Effective-dated selling prices and VAT rates.
- Append-only stock movement ledger with a fast current-balance projection.
- Sales documents: manual entry and a shared sales API for the future OmniStock POS; no external
  POS software integration or external-item mapping work in the current release.
- Stock counts, adjustments, write-offs, and inter-location transfers.
- Purchase-cost corrections, sales corrections, selling-price changes, purchase cancellation,
  customer/supplier returns, and damaged or spoiled stock disposition (§5.7).
- Live stock and same-day sales views.
- Analytics: sales by day/week/month, best sellers, category mix, velocity, year-over-year and
  seasonality, expiry risk, and reorder suggestions — each declaring whether it has enough history
  to be trustworthy (§8.5).
- Financials: revenue, cost of goods sold, and gross profit by month, quarter, and year, in MKD.
- EUR display conversion on the dashboard, as a presentation lens over MKD (§5.3.1).
- A mock OmniStock client: deterministic sales generator and a runnable fake till
  (§6.4).
- A seeded demo organization showing the mature two-year analytics experience (§8.5).
- **e-Faktura at launch** to the UJP specification (§7): issuing document types 100, 110, 120, 160 and 170;
  client-side JWS signing; storno and correction; matching plus two-step accept/reject of incoming
  supplier invoices; purchase VAT totals; and synced UJP codelists.
- Worker permissions scoped per location, assigned through job presets (IPD-031; exact presets pending).
- Table and chart primitives added to the shared UI package.

### Deferred

- **OmniStock POS is the chosen next product phase.** Build its checkout/till screens after the
  inventory system. Define its shared sales contract and prove fiscal-device communication early.
- External POS vendor adapters, external product-code mapping and receipt-import worklists.
- Hardware fiscalization and Z-report transmission to the UJP. e-Faktura is *not* fiscalization;
  see §7.
- e-Faktura document types 130 (авансна фактура) and 150 (времена ситуација).
- Server-side or unattended e-Faktura signing. Signing is client-side only; see §7.5.
- Subscription billing, payroll, operating expenses, and net profit. This release computes **gross
  profit on goods only** for operational use. Accountant-grade period closing and valuation policy
  are future decisions; invoice correctness and auditability are still release requirements.
- Manufacturing, bills of materials, assembly, and recipes.
- Consignment stock, serial-number tracking, and warranty.
- Demand forecasting beyond descriptive seasonality indices. No ML.
- Purchase-order approval workflows and supplier portals.
- **Historical data backfill.** Customers are not expected to have importable prior-year data; all
  analytics accrue forward from go-live (§8.5).
- Multi-currency *transactions*, FX gain/loss, and rate-dated conversion inside rollups. EUR display
  conversion is included; multi-currency accounting is not (§5.3.1).
- External message brokers. Use durable PostgreSQL work records for rollups, invoice work and
  later POS fiscal outcomes; a single rollup timer is not the entire background-work requirement.

## 4. Platform integration

The Inventory Portal is a *subscribed portal*, exactly as the platform was designed for
(VPD-003). Adding it requires no enum migration:

```text
User
  -> Member (Organization membership)
       -> Organization
            -> OrganizationPortalSubscription(portalKey: 'inventory')
            -> MemberPortalAccess(portalKey: 'inventory')
            -> VendorProfile      -> catalog products and versions
            -> StockLocation[]    -> inventory stock, receipts, sales, analytics
```

Adding the portal is one seeded `Portal` row with key `inventory`, reusing
`OrganizationPortalSubscription` and `MemberPortalAccess` unchanged.

### 4.1 Tenancy anchor

Inventory data is scoped by **`organizationId`**, with `stockLocationId` as a mandatory second
dimension on everything physical.

`VendorProfile` is deliberately *not* reused as the inventory tenancy anchor. A vendor profile is a
producer identity — who makes the goods. Inventory answers a different question — who holds the
goods. An organization that only resells never has a meaningful vendor profile, and an organization
that produces may hold its goods in several locations under one profile. Introducing a parallel
`InventoryProfile` was considered and rejected as ceremony without a driver: the organization is
already the legal-entity boundary that gross profit is reported against.

`StockLocation` is mandatory from day one even for single-store organizations (they simply have one
row). Retrofitting a location key onto a movement ledger and every rollup table later is a
migration nobody wants to run.

### 4.2 Authorization chain

Every inventory request resolves, in order:

1. Authenticated Better Auth session.
2. Active `Member` record for the active Organization.
3. `OrganizationPortalSubscription(portalKey: 'inventory')` in `ACTIVE` status and within its date
   window.
4. Owner status, or `MemberPortalAccess(portalKey: 'inventory', enabled: true)`.
5. Worker permission assignments granting the requested action at every affected location, with
   explicit scope for organization-wide actions (IPD-031).

Failure at any step denies the request before domain work begins, matching the Vendor Portal's
established pattern.

### 4.3 Roles

**Revised by IPD-031:** different worker types need different action and data access. The earlier
closed manager/staff/viewer proposal below is historical, not the final authorization contract.
In particular, receipt-cost access must not be granted to every warehouse worker. The working
[UX and permissions proposal](inventory-ux-and-permissions.md) separates job presets, location
scope, viewing sensitive data, preparing documents and posting/approving them. Exact preset grants
await confirmation of target-store jobs; do not implement the broad staff row as the default.

Earlier proposal, retained for traceability:

| Role | Can |
|---|---|
| `INVENTORY_MANAGER` | Everything at the location, including purchase cost, margin, and financial views |
| `INVENTORY_STAFF` | Receive stock including receipt cost entry/view, count, adjust, record sales and view stock; no margin/financial analytics, general stock valuation, posted-cost corrections or selling-price management |
| `INVENTORY_VIEWER` | Read-only stock and expiry; no financials |

The earlier `InventoryRoleAssignment(memberId, stockLocationId, role)` sketch and null-location
organization-wide grant need revision before implementation. Organization-wide authority must be
explicit. Owners retain administration, but permissions never bypass domain or signing requirements.

**Receiving permission chosen under founder delegation:** receiving staff may see and enter the
supplier costs on receiving documents at their authorized locations, including bulk totals, and
post complete receipts. Managers control posted-cost corrections, selling-price changes, profit
and financial analytics. Staff may release stock using an already manager-approved price; creating
or changing that price needs a manager. This avoids making every delivery wait for a manager to
retype a supplier invoice. Receipt cost access does not grant general valuation or margin access.
Enforce the distinction in services/serializers and test each permitted and redacted response.

## 5. Data model

### 5.1 Catalog: items, suppliers, locations

```prisma
enum InventoryItemSource { CATALOG  EXTERNAL }
enum StockLocationKind   { WAREHOUSE  STORE }
enum StockAllocationPolicy { FIFO  FEFO  MANUAL }

model StockLocation {
  id             String  @id @default(uuid())
  organizationId String
  code           String            // human key, unique per org
  name           String
  kind           StockLocationKind
  allocationPolicy StockAllocationPolicy @default(FIFO) // configurable; FEFO suggested for expiry-led warehouses
  timezone       String            // IANA, e.g. "Europe/Skopje"
  // New sales must not exceed available sellable stock in this release.
  // Fiscal outcomes recovered after interruption use the separate discrepancy path in §6.2.
  isActive       Boolean @default(true)
  // @@unique([organizationId, code])
}

model Supplier {
  id             String  @id @default(uuid())
  organizationId String
  name           String
  taxNumber      String?           // ЕДБ for MK suppliers
  contactEmail   String?
  contactPhone   String?
  leadTimeDays   Int?              // feeds reorder suggestions
  isActive       Boolean @default(true)
}

model InventoryItem {
  id               String  @id @default(uuid())
  organizationId   String
  source           InventoryItemSource
  productVersionId String?           // set when source = CATALOG
  defaultSupplierId String?
  name             String            // denormalised for CATALOG items, authored for EXTERNAL
  sku              String
  barcode          String?
  categoryId       String?           // reuses the seeded 126-category taxonomy
  unitOfMeasure    String  @default("PCS")
  trackLots        Boolean @default(false)
  trackExpiry      Boolean @default(false)
  reorderPoint     Int?
  reorderQuantity  Int?
  searchText       String  @default("")
  isActive         Boolean @default(true)
  // @@unique([organizationId, sku])
  // pg_trgm GIN index on searchText, matching the vendor catalog convention
}
```

The catalog-linked / supplier-only duality is enforced by a database `CHECK`, not by convention:

```sql
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_source_shape CHECK (
  (source = 'CATALOG'  AND product_version_id IS NOT NULL) OR
  (source = 'EXTERNAL' AND product_version_id IS NULL)
);
```

`name`, `barcode`, and `categoryId` are denormalised onto `InventoryItem` for `CATALOG` items so
every stock, sales, and analytics query is a single-table read on the inventory side. A background
sync keeps them aligned with the source `ProductVersion`; the item retains its own values if the
catalog record is deleted. This is a deliberate trade of a small consistency job for a very large
number of avoided joins in the hot analytics path.

### 5.2 The ledger

This is the centre of the system.

```prisma
enum StockMovementReason {
  OPENING_STOCK  RECEIPT  SALE  SALE_RETURN  SUPPLIER_RETURN  RECEIPT_REVERSAL
  ADJUSTMENT  COUNT_CORRECTION
  WRITE_OFF_EXPIRED  WRITE_OFF_DAMAGED  WRITE_OFF_SPOILED
  TRANSFER_OUT  TRANSFER_IN
}

model StockLot {
  id              String   @id @default(uuid())
  organizationId  String
  inventoryItemId String
  stockLocationId String
  lotCode         String?             // supplier batch code
  expiryDate      DateTime?           // per bulk delivery — the requested capability
  receivedAt      DateTime
  receivedQuantity Decimal           // immutable original cost-layer quantity
  originalCostMinor BigInt            // authoritative total landed cost for this layer
  saleReadyAt     DateTime?           // price confirmed before release for sale
  saleReadyByUserId String?
  saleReadyPriceId String?            // item or batch price reference confirmed at release
  // Unit cost is derived exactly from total value / quantity, not rounded and stored as truth.
  currency        String   @default("MKD")
  goodsReceiptLineId String?
  // @@index([organizationId, inventoryItemId, expiryDate])
}

model StockMovement {                 // APPEND ONLY. Never updated. Never deleted.
  id                 String  @id @default(uuid())
  organizationId     String
  stockLocationId    String
  inventoryItemId    String
  stockLotId         String?
  quantityDelta      Decimal            // signed; Decimal for weight/volume units
  reason             StockMovementReason
  costAmountMinor    BigInt?            // allocated total value; null only for unresolved recovery facts
  occurredAt         DateTime           // business time, not insert time
  recordedAt         DateTime @default(now())
  sourceDocumentType String?            // 'GOODS_RECEIPT' | 'SALES_DOCUMENT' | 'STOCK_COUNT' | ...
  sourceDocumentId   String?
  sourceDocumentLineId String?
  reversalOfMovementId String?
  actorUserId        String?
  note               String?
  // @@index([organizationId, occurredAt])
  // @@index([organizationId, inventoryItemId, stockLocationId, occurredAt])
  // @@index([sourceDocumentType, sourceDocumentId])
}

model StockBalance {                  // projection, rebuildable from the ledger at any time
  id              String   @id @default(uuid())
  organizationId  String
  stockLocationId String
  inventoryItemId String
  stockLotId      String?
  quantityOnHand  Decimal
  updatedAt       DateTime @updatedAt
  // @@unique([stockLocationId, inventoryItemId, stockLotId])
}
```

`StockBalance` is written in the **same transaction** as the movement, under
`SELECT ... FOR UPDATE` on the balance row. It is a cache with a correctness guarantee: a
`rebuildBalances` command recomputes it from the ledger, and an integrity test asserts
`sum(movements) == balance` for every key.

Why the ledger rather than a quantity column: it is the only structure that simultaneously gives
live stock, correct historical stock at any past date, auditable adjustments, per-lot cost, and a
substrate every analytic can be derived from. A mutable counter gives none of those and introduces
lost-update races.

### 5.3 Pricing

```prisma
model ItemPrice {                     // effective-dated; changes create versions with explicit interval closure
  id              String    @id @default(uuid())
  organizationId  String
  inventoryItemId String
  stockLocationId String?             // null = applies to all locations
  stockLotId      String?             // optional batch override; tenant/item/location must agree
  priceMinor      BigInt              // gross, VAT-inclusive
  vatRateId       String
  currency        String    @default("MKD")
  validFrom       DateTime
  validTo         DateTime?           // null = current
  // @@index([inventoryItemId, stockLocationId, validFrom])
}

model VatRate {
  id             String   @id @default(uuid())
  organizationId String
  name           String                // "Standard 18%", "Reduced 10%", "Reduced 5%"
  percent        Decimal @db.Decimal(5, 2)
  validFrom      DateTime
  validTo        DateTime?
}
```

Effective dating is not optional here. Margin analytics over a year is wrong the moment a price
change overwrites a historical transaction price. Transaction price snapshots preserve margin;
effective-dated price lists select the price for a new sale. Use non-overlapping half-open intervals
`validFrom <= at AND (validTo IS NULL OR at < validTo)`, with explicit location precedence and
interval-closure rules; the selector is a pure function in the domain package.

A received batch may remain on hand while awaiting selling-price confirmation; it is excluded
from sellable availability. Offer **Use previous selling price for this item** with the previous
price and its date visible, or enter a new price. Confirming release records the actor and price
reference. A purchase cost must never be substituted for a missing selling price.

**Price-change scope is an explicit choice:** **This batch only** or **All batches of this item**.
Show affected locations, lots, quantities and prices before applying. Default to the current
location, with an explicit authorized-location selector for broader changes. A batch override
references its lot; normal precedence is batch, location-item, organization-item. Applying to all
batches must supersede conflicting active batch overrides in the selected scope, with history
preserved; merely updating a default would not fulfill the user's choice. Batch-only changes do
not silently alter the default offered for future receipts.

The future POS must identify the actual batch when simultaneously sellable batches have different
prices: use a batch-specific label/code or explicit cashier selection. A shared item barcode is
insufficient, and assumed FIFO/FEFO must never silently select what the customer is charged. Split
sale allocations into correctly priced lines if a quantity spans differently priced batches.
The precise label/selection UX is a POS design task; the inventory model supports it now.

### 5.3.1 Currency: MKD is the ledger, EUR is a lens

**Decided: MKD is the only transactional currency. EUR exists solely as a display conversion on
the dashboard.** These are different things and conflating them would corrupt the books.

Every stored amount — lot cost, price, sales document, movement, rollup, financial summary — is
MKD minor units (deni), always. No EUR value is ever written to the database, to a rollup, or to a
financial export of record. Conversion happens at the **presentation boundary only**, on data
already read.

```prisma
model OrganizationInventorySettings {
  organizationId  String  @id
  ledgerCurrency  String  @default("MKD")   // not user-changeable in this release
  displayCurrency String  @default("MKD")   // 'MKD' | 'EUR' — presentation only
  eurRateMinor    Int                       // deni per 1 EUR, e.g. 6150 == 61.50
  eurRateNote     String?                   // provenance, e.g. "NBRM reference, 2026-09-01"
  eurRateUpdatedAt DateTime
}
```

The rate is **configuration, never a hardcoded constant**. The denar is maintained in a de facto
peg to the euro at roughly 61.5 MKD, which is why a single current rate is adequate here — but a
peg is a policy, not a law of nature, so it is stored, attributed, and dated.

Three rules make this safe:

- **Convert last, never twice.** Conversion is applied once, to a final MKD figure, at render time.
  Never convert a per-line amount and then sum, which compounds rounding across thousands of rows.
- **Never round-trip.** A EUR figure is never parsed back into a stored amount. All input forms
  accept MKD regardless of the display setting.
- **Always label.** A converted figure is rendered as indicative and carries its rate, for example
  `≈ €12,340 (at 61.50 MKD/EUR)`. An unlabelled euro number on a screen a manager uses for
  purchasing decisions invites someone to treat a display convenience as an accounting fact.

Statements of record — the monthly, quarterly, and yearly gross-profit figures and their CSV
exports — are **MKD only**, with no EUR column. This is deliberate: exports are the artifact most
likely to be forwarded to an accountant, and an indicative conversion has no place there.

Multi-currency *transactions* (buying from a foreign supplier in EUR, FX gain/loss, rate-dated
conversion inside the rollups) remain deferred. The `currency` column on every money-bearing table
is what keeps that door open without a redesign.

### 5.4 Receiving

```prisma
model GoodsReceipt {
  id               String   @id @default(uuid())
  organizationId   String
  stockLocationId  String
  supplierId       String?
  supplierDocumentRef String?          // supplier's invoice / delivery note number
  receivedAt       DateTime
  freightCostMinor BigInt   @default(0)
  otherCostMinor   BigInt   @default(0)
  currency         String   @default("MKD")
  status           String                // DRAFT | POSTED
  postedAt         DateTime?
}

model GoodsReceiptLine {
  id              String @id @default(uuid())
  goodsReceiptId  String
  inventoryItemId String
  quantity        Decimal
  purchaseTotalMinor BigInt            // required total purchase cost for this item quantity
  lotCode         String?
  expiryDate      DateTime?
}
```

The receiver enters quantity and either unit purchase cost or **total cost for this item quantity**.
For example, 200 milk cartons costing 12,000 MKD require only those two inputs; the portal shows
60 MKD per carton automatically. Preserve the authoritative line total, the entered cost basis,
and tax/discount treatment; suppliers may quote amounts with or without VAT, so the input must
make that basis explicit. Do not make the receiver divide or distribute rounding remainders.

Posting requires cost on every line. It creates a `StockLot` per line, emits `RECEIPT` movements,
and updates balances in one transaction. Freight and other charges are allocated into total layer
values. The exact quantity/value allocation must conserve the total across partial sales and
returns, including residual minor units; a rounded displayed unit cost is not authoritative.
Cost correction remains possible later through linked value adjustments (§5.7).

A `DRAFT` receipt writes nothing to the ledger. Only `POSTED` moves stock.

### 5.4.1 Opening inventory and onboarding

Opening inventory is not historical sales backfill and is not a current-period purchase. Provide
an `OpeningStockDocument` with location, cutover time, item/lot lines, existing quantities, expiry
where tracked, required purchase totals and provenance, and selling-price/release confirmation.
Support manual entry and bulk import with row validation, preview, save/resume, correction before
posting, and an explicit reconciliation/sign-off step. Post idempotently as `OPENING_STOCK`.
Existing stock contributes to stock value and later COGS, but not new-period purchase totals.

Missing cost blocks posting that line; missing sale price blocks release for sale. An entered zero
cost must be distinguishable from an absent value; the treatment of genuinely free supplier units
and costs unavailable during opening setup needs an explicit exception decision. Never default to
zero. Unknown lot/expiry information must be identified, not invented.

Measure time and manual effort from signup to reconciled opening stock and the first successful
sale. Provide an actionable checklist for uncosted rows, missing prices and missing item barcodes.
Record the exact POS cutover boundary so opening quantities and imported sales do not overlap.

### 5.5 Sales

One model covers manual entry, our future POS, fiscal receipts, and invoices.

```prisma
enum SalesDocumentType    { FISCAL_RECEIPT  INVOICE  CREDIT_NOTE }
enum SalesDocumentChannel { MANUAL  POS  IMPORT  API }
enum SalesDocumentStatus  { DRAFT  POSTED  VOIDED }

model SalesDocument {
  id               String   @id @default(uuid())
  organizationId   String
  stockLocationId  String
  type             SalesDocumentType
  channel          SalesDocumentChannel
  status           SalesDocumentStatus
  documentNumber   String
  issuedAt         DateTime
  currency         String   @default("MKD")
  netMinor         BigInt
  vatMinor         BigInt
  grossMinor       BigInt
  cogsMinor        BigInt?                // original capture; null only for unresolved recovery facts
  valuationStatus String                 // COMPLETE | PENDING; corrections are linked value entries
  customerName     String?
  customerTaxNumber String?               // ЕДБ, required on an invoice
  // --- stable operation identity for manual entry / our future POS ---
  operationId      String
  sourceTillId     String?
  // --- fiscal / e-invoice references (this portal RECORDS these; it does not produce them) ---
  fiscalReceiptNumber String?
  fiscalDeviceId      String?
  eInvoiceId          String?
  eInvoiceStatus      String?
  // @@unique([organizationId, operationId])   // shared sale lifecycle idempotency
  // @@index([organizationId, stockLocationId, issuedAt])
}

model SalesDocumentLine {
  id               String  @id @default(uuid())
  salesDocumentId  String
  inventoryItemId  String
  quantity         Decimal
  unitPriceMinor   BigInt
  discountMinor    BigInt @default(0)
  vatRateId        String
  lineNetMinor     BigInt
  lineVatMinor     BigInt
  lineCogsMinor    BigInt?                // original allocated total; recovery exceptions may be pending
}
```

For a new portal sale, require a confirmed selling price and enough available, sale-ready stock
for the entire requested quantity, including other lines in the same document. Check and allocate
atomically so two tills cannot both acquire the last unit. Blocking only when stock is already
negative is insufficient: selling three units when two remain must also be blocked. A completed
fiscal sale discovered during recovery uses the separate fact-capture path (§6.2).

Posting a new sales document, in one transaction:

1. Allocate each line against sale-ready lots using the location's configurable FIFO, FEFO or
   manual policy. Suggest FEFO for expiry-led warehouses. Stores may use assumed FIFO when actual
   shelf selection is not tracked. Record observed versus assumed allocations; a setting does not
   prove shoppers picked that batch. Warehouse pick lists recommend the batch and staff confirm
   the actual pick/override. Differently priced batches require actual selection (§5.3).
   Expired/held goods remain unavailable under every policy. Financial costing policy remains a
   separate decision; changing physical rotation must not rewrite historical costing.
2. Emit one `SALE` movement per allocated lot, carrying the exact allocated total cost.
3. Sum allocated cost into `lineCogsMinor` and `cogsMinor`.
4. Update balances.

Step 2 is what makes gross profit correct and permanently auditable: profit is
`netMinor - cogsMinor` over immutable rows, not a subtraction against whatever the purchase price
happens to be today.

That expression is the original-sale baseline. Corrected operational margin incorporates linked
sales-value and cost adjustments. Pending recovery valuation must remain visibly incomplete and
must never be treated as zero cost. The correction-period policy is still open (§5.7).

Corrections and voids use the explicit physical/financial effects in §5.7. A financial document
cancellation does not automatically prove that goods were returned.

### 5.6 Counts and transfers

`StockCount` / `StockCountLine` capture a physical count and emit `COUNT_CORRECTION` movements for
the difference. `StockTransfer` / `StockTransferLine` emit a `TRANSFER_OUT` at the origin and a
`TRANSFER_IN` at the destination, moving lot identity (and therefore expiry and cost) with the
goods.

### 5.7 Corrections, purchase cancellation, returns and losses

These are first-release workflows. Every posted correction references its original document and
line, with actor, reason, effective time, recorded time and idempotency protection.

| Action | Stock effect | Value/document effect |
|---|---|---|
| Correct a purchase cost | None | Append a value adjustment; allocate between remaining stock and previously consumed quantities |
| Change a future selling price | None | New effective price; existing sales keep their original price |
| Correct a completed sale's price/discount | None unless goods also move | Linked sales value correction and applicable invoice correction |
| Correct a sold quantity/item | Only the actual reversal/replacement quantity | Linked line and original cost-allocation correction |
| Cancel a draft purchase/receipt | None | Mark cancelled; retain draft audit metadata |
| Reverse an incorrectly posted receipt | Compensating quantity, with dependency checks | Reverse the corresponding value; do not erase downstream sales |
| Return goods to supplier | Remove the actual returned quantity | Record claim/credit separately from physical return |
| Customer return | Restore only goods actually received | Reverse original allocation/value for the accepted returned quantity |
| Damaged, dysfunctional or spoiled goods | Hold out of sellable stock, then write off or return | Record loss or supplier claim; never create fictional sales |

Use a linked `InventoryValueAdjustment` (receipt/lot/allocation references, signed amount, currency,
effective and recorded times) for value-only corrections. Posted original costs remain immutable;
current reports incorporate the correction trail. Partial returns must not exceed the original
sale/receipt quantities after earlier returns. A price-only correction has zero stock delta.

**Period/export policy pending:** operational reports must reflect corrections, but whether a
correction restates an earlier period or appears as an adjustment in a later period is not yet
decided. Preserve enough history to identify what an earlier export contained and when it was
produced. Formal accounting period locks are not implied by the initial management-report scope.

## 6. Sales capture: manual entry and the future OmniStock POS

The founder has selected an OmniStock POS, developed after inventory. External POS software
adapters and external item-code reconciliation are out of scope. Both our manual entry and POS
will call the same inventory sales services with canonical item/lot IDs.

### 6.1 Manual entry

Provide item search, quantities, confirmed prices, tax/discount calculations and company invoice
details. Check sellable stock and price eligibility atomically. Before the POS phase, manual
entry is useful for warehouse invoicing and development/pilot validation; it is not a replacement
for a working fiscal checkout in a retail store. e-Faktura remains an inventory launch requirement.

### 6.2 Shared sale lifecycle

The contracts package owns versioned request/response schemas for preparing a sale, reserving
stock, committing its confirmed outcome, cancelling/releasing, and resolving an uncertain outcome.
Money and quantities cross the wire as exact decimal/integer strings. The server resolves price
versions and validates submitted totals; it does not trust arbitrary prices from a till.

Identify each operation by organization, location, registered till and stable operation ID, with
a payload hash. Same ID/same payload returns the recorded result; a changed payload conflicts.
Canonical item IDs replace external-code mapping. Unknown/deactivated items are rejected before
a new sale; an already completed fiscal fact discovered during recovery is preserved as evidence
and reconciled, not erased or assigned zero cost.

Reserve/allocate stock atomically across tills. Reserve before fiscal submission and finalize the
inventory effect once the outcome is known. Fiscal hardware and PostgreSQL do not share one
transaction. Persist sale intent, approved prices/allocations, fiscal job, attempt and outcome
references. Hold an uncertain operation for recovery; do not create a new fiscal receipt or
release its reserved stock solely because a response timed out. Price changes while a cart is
open must be detected before fiscalization, with explicit confirmation/repricing.

An offline-sales policy has not been selected. Online stock authorization is the planning default;
full autonomous offline checkout needs a separate stock-allotment/synchronization design and
estimate. A local printer bridge surviving a browser restart does not by itself enable offline sales.

### 6.3 Fiscal-device adapter boundary

Our POS sends structured receipt requests to a local fiscal bridge on the till computer. That
bridge implements one supported device/firmware protocol first and serializes operations per
printer. The inventory domain contains no serial-port or printer-specific code.

Suggested flow: OmniStock POS -> shared sale authorization -> local fiscal bridge -> certified
device -> confirmed fiscal result -> idempotent sale finalization.

The bridge exposes device identity/status, fiscal receipt submission/outcome recovery and
supported void/report operations. It stores a durable job journal, checks caller/device binding,
and accepts authorized structured operations rather than arbitrary public print commands. Device
initialization/tax programming is outside routine cashier control and must follow provider rules.
See the official documentation and proof checklist in the fiscal-printer research note.

### 6.4 Simulator and independent correctness fixtures

Retain a deterministic sales generator and runnable fake OmniStock till using the shared sale
lifecycle. Simulate duplicates, last-unit contention, changed-price conflicts, batch-specific
prices, receipt corrections, and fiscal timeouts/disconnects. Add a fiscal-adapter simulator with
known, failed and uncertain results. These tools do not communicate with real fiscal hardware.

Keep the small hand-computed financial oracle independent of production costing code. A separate
seeded generator can create the larger demo/performance dataset through the same application
services, without printing real receipts. Real-device testing is a separate supervised proof on
an appropriately provisioned test device, not a performance-test target.

## 7. Macedonian fiscal context and e-Faktura

Research findings, and the architectural stance they produce.

**Hardware fiscalization.** North Macedonia runs a hardware-based fiscalization regime. Certified
fiscal devices with fiscal memory and a GPRS security module sign, store, and automatically
transmit daily financial reports to the Public Revenue Office (UJP). The exact certification and
integration obligations for the selected software/device combination must be verified with its
authorized provider. See [Macedonian POS research](inventory-pos-macedonia-research.md) for primary
sources and the distinction between fiscal equipment and POS software.

**Stance on fiscalization.** Do not build it here. It requires certified hardware and belongs to
the future POS portal or the device vendor. This portal *records* `fiscalReceiptNumber` and
`fiscalDeviceId` as references received from whatever system fiscalized the sale. e-Faktura and
fiscalization are different obligations: a retail sale to a walk-in customer produces a fiscal
receipt from a certified device; an invoice to a company produces an e-Faktura. They are not
substitutes for each other.

**Retention verification pending.** The earlier blanket ten-year assertion was unsupported. UJP's
guide describes five years for receipt control trails; other records may have different obligations
and the guide contains older provisions. Determine current retention per record type before setting
policy. Preserve the append-only audit trail; §8 does not yet specify a partition implementation.

**VAT is modelled from day one.** Macedonia has a standard 18% rate plus reduced rates, so a single
hardcoded percentage would be wrong immediately, and gross profit needs the net figure.

### 7.1 e-Faktura is in release scope

e-Faktura is **required at launch**, reconfirmed on 2026-09-05. A supported browser/certificate
signing and submission proof belongs at the beginning of implementation, not after analytics.
This section was written against the primary source, the UJP
wiki at `efakturawiki.ujp.gov.mk`, and its test environment at `efakturatest.ujp.gov.mk`.

### 7.2 A correction to the earlier draft

An earlier revision of this blueprint stated that e-Faktura uses **UBL 2.1 XML following EN 16931**.
That came from secondary commentary and **it is wrong**. The UJP specification defines a
**proprietary JSON document**, digitally signed as a **JWS (JSON Web Signature, RS256)**. There is
no UBL, no XML, and no EN 16931 syntax binding in the actual interface.

This matters because the two designs are not close: an EN 16931 mapping layer, a UBL serialiser,
and a Peppol-style access-point integration would all have been wasted work. Everything below is
taken from the UJP wiki rather than from general European e-invoicing practice.

**Legal/technical verification pending.** The earlier draft-law description and detailed wiki
claims were not reverified in the 2026-09-05 review; the technical wiki could not be retrieved.
Confirm the current enacted obligations, API version and supported test/production access before
implementation sign-off. The founder requires e-Faktura at launch regardless of an assumed future
mandate date. The early integration proof must validate the technical contract rather than relying
on this document's unverified details.

### 7.3 The submission model

```text
build JSON document  ->  sign as JWS (RS256, qualified cert)  ->  POST to UJP
                                                                     |
                              EUID + receipt timestamp + qr_link  <--+
                                                                     |
                                  store EUID, print QR on the document
```

1. Build the document JSON with the fields required for its `docType`.
2. Sign it with the taxpayer's qualified certificate, producing
   `BASE64URL(header).BASE64URL(payload).BASE64URL(signature)` where
   `signature = RSA-SHA256(...)` and the JOSE header is `{"alg":"RS256","typ":"JWT"}`.
3. `POST /api/v1/sales-invoices/send` with `{ requestTimestamp, jws }`.
4. UJP validates and returns `euid`, `timestamp`, and `qr_link`.
5. The EUID goes on the document as text and the `qr_link` as a QR code.

**Required request headers** on every call: `X-EUJP-ID` (the signing user's e-UJP identifier),
`X-EDB` (the tax number of the company performing the turnover), `X-SERIAL-NUMBER` (certificate
serial, wherever signing is involved), and `X-DOC-TYPE-CODE` on send.

**`requestTimestamp` is a replay defence and is inside the signature.** Format
`2026-01-05T12:00:00`, **Skopje local time**, and the server rejects anything outside roughly a
±5 minute window. Two consequences we must design for: never format it in UTC, and never trust the
application server's clock. UJP exposes `GET /api/v1/server-time`; we sample it, store the offset,
and derive `requestTimestamp` from a corrected clock. A drifting container clock would otherwise
reject every invoice with no obvious cause.

**Rate limit: 1 request per second, per user.** Submission is therefore a serialised, queued
operation with backoff — never a burst of parallel posts when someone batches ten invoices.

### 7.4 Document types in scope

| Code | Name | In scope | Maps to |
|---|---|---|---|
| 100 | Фактура | **yes** | A posted `SalesDocument` of type `INVOICE` |
| 110 | Книжно одобрение (credit note) | **yes** | A void or a return that reduces what the buyer owes |
| 120 | Книжно задолжение (debit note) | **yes** | A post-issue increase |
| 160 | Фактура/Испратница (invoice + delivery note) | **yes** | A warehouse shipment invoiced on delivery |
| 170 | Фактура кон физичко лице | **yes** | An invoice to a natural person |
| 130 | Авансна фактура (advance) | no | Deferred; no prepayment flow in this release |
| 150 | Времена ситуација (progress billing) | no | Construction-style interim billing; out of domain |

**Storno and correction reuse the same send endpoint**, distinguished by a header flag:
`docStorno = 1` cancels (quantities and totals negative, with a void reason code from the `S-*`
codelist); `docStorno = 2` corrects (a new document referencing the corrected one, carrying the
lines that remain delivered, with a correction reason from the `C-*` codelist). This maps cleanly
onto the ledger rule in §5.5 that a void is a compensating entry rather than a deletion.

### 7.5 Signing: client-side, and we never hold a private key

**Decided: signing happens client-side through the UJP browser extension against the user's local
certificate or USB token. The platform never stores, transmits, or has access to a private key.**

```text
server: build unsigned JSON  ->  browser: extension signs with local cert  ->  server: relay JWS to UJP
```

The server composes and validates the document, hands the canonical JSON to the browser, the
extension produces the JWS, and the server relays it and records the result. What we persist is the
*signed* payload and UJP's response — never key material.

The reason is not merely security hygiene. A qualified electronic signature is meaningful precisely
because it stays under the sole control of the signatory; a SaaS holding customers' qualified
private keys so it can sign unattended undermines the legal property the signature is supposed to
have, and takes on custody liability we should not want. UJP's own tooling works this way.

The cost is real and should be stated: **signing requires a human at a desktop browser with their
certificate present.** There is no unattended or scheduled submission. A queued invoice waits until
an authorised user signs it. The UI must therefore treat "awaiting signature" as a normal, visible
state with a clear worklist, not an error.

`EInvoiceSigner` is an interface in the domain package with one implementation today
(`BrowserExtensionSigner`). If the law and risk appetite ever permit an HSM-backed server signer,
it is a second implementation rather than a redesign.

### 7.6 Data model

```prisma
enum EInvoiceDirection { OUTGOING  INCOMING }

model EInvoiceDocument {
  id               String   @id @default(uuid())
  organizationId   String
  direction        EInvoiceDirection
  docTypeCode      String                    // 100 | 110 | 120 | 160 | 170
  euid             String?  @unique          // assigned by UJP on acceptance
  qrLink           String?
  ujpStatusCode    String?                   // 00 01 03 04 05 07 09 10
  receivedAt       DateTime?                 // UJP receipt timestamp
  salesDocumentId  String?                   // outgoing: the sale it represents
  goodsReceiptId   String?                   // incoming: the delivery it was matched to
  counterpartyEdb  String
  counterpartyName String
  netAmountMinor   BigInt
  vatAmountMinor   BigInt
  grossAmountMinor BigInt
  payloadJson      Json                      // canonical unsigned document
  signedJws        String?                   // what we actually sent
  ujpResponse      Json?
  lastErrorCode    String?                   // E1xxx / E4xxx
  // @@index([organizationId, direction, ujpStatusCode])
}

model EInvoiceCredential {                   // NEVER holds a private key
  id             String @id @default(uuid())
  organizationId String
  userId         String                      // the human signatory
  eujpId         String
  edb            String                      // company tax number
  certSerial     String
  certSubject    String
  certNotAfter   DateTime                    // drives expiry warnings
  // @@unique([organizationId, userId, certSerial])
}

model EInvoiceCodelist {                     // cached UJP шифрарници
  id          String   @id @default(uuid())
  listName    String                         // payment-types, void-reasons, tax-indicators, ...
  code        String
  name        String
  payload     Json
  validFrom   DateTime?
  validTo     DateTime?
  syncedAt    DateTime
  // @@unique([listName, code])
}
```

Statuses are UJP's, stored verbatim rather than remapped: `00` Нацрт, `01` Испратена, `03`
Прифатена, `04` Автоматски прифатена, `05` Одбиена, `07` Сторнирана, `09` Корегирана, `10`
Евидентирана. Inventing our own parallel status vocabulary would guarantee drift.

**Codelists are synced, never hardcoded.** Payment types (`P10` cash, `P11` card, `P12` bank),
void reasons (`S-*`), correction reasons (`C-*`), reject reasons (`O-*`), countries, currencies,
document types, and tax indicators all come from UJP endpoints and are cached with their validity
dates. A scheduled refresh keeps them current; a document referencing an unknown or expired code
is rejected by UJP, so validating against the cache before submission turns a remote failure into
a local one.

### 7.7 Tax indicators and the totals arithmetic

Each line carries a tax indicator (for example `DDV-A` standard 18%, `DDV-B`, `DDV-G` not
VAT-registered) whose `vatImpact` drives calculation:

| `vatImpact` | Meaning | Effect |
|---|---|---|
| `STANDARD` | Standard rates (5%, 10%, 18%) | VAT calculated and shown |
| `NULA` | Zero-rated | Not calculated; reported as 0 |
| `OSLOBODEN` | Exempt turnover | Not calculated, not shown; 0 in JSON |
| `PRENESEN` | Reverse charge, Article 32 | Not in line or document totals; appears in per-indicator totals with a transfer note |

**The rounding order is specified and must be replicated exactly.** UJP computes VAT *per unit*
and then multiplies by quantity:

```text
docItemUnitPriceWoVat       = docItemUnitOriginalPriceWoVat - docItemUnitDiscountAmount
docItemUnitVat              = docItemUnitPriceWoVat * docItemVat / 100
docItemTotalPriceWoVat      = docItemQty * docItemUnitPriceWoVat
docItemTotalVat             = docItemQty * docItemUnitVat        <- per-unit VAT, then scaled
docItemTotalPriceWVat       = docItemTotalPriceWoVat + docItemTotalVat
```

This is **not** the same as applying the VAT rate to the line total, and the two differ by rounding
on ordinary quantities. Computing it the intuitive way produces documents UJP rejects for a
totals mismatch, with an error that points at the amount rather than at the method. The domain
package implements UJP's order verbatim, as a pure function with table-driven tests covering the
rounding boundaries, and our ledger figures are reconciled against it before submission rather
than after a rejection.

Document and per-indicator totals follow the same specified sums (`docNetAmount`,
`docDiscountAmount`, `docNetAmountDisc`, `docVatAmount`, `docGrossAmount`, `docFinalAmount`; and
`vatTaxableAmount`, `vatAmount`, `vatTotalAmount` grouped by VAT group and tax indicator).

### 7.8 The two user flows

**Selling — issue an e-Faktura.** On posting a sale, a dialog asks whether the transaction needs a
faktura. Retail to a walk-in customer does not; a sale to a company does.

1. Post the sale to the ledger first. **The stock movement never depends on UJP being reachable.**
2. If a faktura is needed, prefill everything we already hold — lines, quantities, prices, VAT
   indicators, seller identity — and ask only for what we do not: buyer ЕДБ and name, payment type,
   delivery date, any reference document.
3. Validate locally: mandatory fields for the `docType`, codelist codes, and the totals arithmetic.
4. Sign in the browser, submit, store `euid`, `qr_link`, and status; render the QR on the printable
   document.

Posting the sale and issuing the faktura are **separate transactions**. A UJP outage, an expired
certificate, or an absent signatory must never block recording that goods left the building.
Unsent documents sit in an "awaiting signature" or "awaiting submission" worklist.

**Receiving — match, verify, then accept or reject.** On goods receipt we are the buyer, so there
is nothing to generate: the supplier's e-Faktura already exists in the UJP system. The dialog
pulls pending incoming documents (`purchase-invoice/ids`, then per-EUID detail) and lets the
manager match one to the delivery.

Acceptance is deliberately **two-step**, as requested:

- **Step 1 — review.** The matched faktura is re-read from UJP and displayed in full against the
  receipt: line-by-line comparison of quantity, unit price, VAT and totals, with differences
  highlighted.
- **Step 2 — explicit verification.** The manager must tick an explicit confirmation ("I have
  checked this invoice against the delivery") before Accept or Reject becomes enabled. Rejection
  requires an official `O-*` reason code and may carry a comment.

The friction is the point. Accepting an incoming faktura is a financial and tax act, and a
single-click accept next to a list of deliveries is exactly how a wrong invoice gets approved. The
verification step is recorded — who confirmed, when, and against which receipt — so the decision is
auditable.

Purchase VAT totals are posted to UJP via `purchase-vat-totals`, grouped by rate and purchase tax
indicator, as the specification requires.

### 7.9 Failure handling

UJP error codes are business (`E1xxx`) or request (`E4xxx`) — for example `E1000` company not
found, `E1013` user not authorised to sign for this company, `E1012` certificate not found,
`E1016` document not in status NEW, `E1024` purchase VAT taxable amount exceeds document taxable
amount. These are stored on the document and surfaced in the operator's language, not as a raw
code. Codes that indicate a *data* problem are not retried; codes that indicate a *transport*
problem are retried with backoff inside the 1-req/s budget.

A certificate expiry warning is driven from `EInvoiceCredential.certNotAfter`. Discovering an
expired certificate at the moment of invoicing is a bad day; discovering it a month out is a
calendar entry.

### 7.10 A useful side effect

`POST /api/v1/currency-exchange/rate` returns the **official NBRM middle rate** for a currency and
date (for example EUR at 61.695). This resolves the EUR display-rate question from §5.3.1: rather
than a manually maintained setting, the rate can be sourced from UJP itself, dated and attributed.
The manual override remains as a fallback for when the service is unavailable.

## 8. Analytics architecture

Three tiers. Nothing skips a tier.

```text
Tier 1  Facts        StockMovement, SalesDocumentLine, StockLot        immutable, never aggregated away
Tier 2  Rollups      DailyItemMetrics, MonthlyItemMetrics,             derived, rebuildable
                     FinancialPeriodSummary
Tier 3  Query        Analytics services -> contracts -> charts         reads rollups (+ today from Tier 1)
```

### 8.1 Rollup tables

```prisma
model DailyItemMetrics {
  id              String   @id @default(uuid())
  organizationId  String
  stockLocationId String
  inventoryItemId String
  day             DateTime  @db.Date        // in the location's timezone
  unitsSold          Decimal @default(0)
  revenueNetMinor    BigInt  @default(0)
  cogsMinor          BigInt  @default(0)
  grossProfitMinor   BigInt  @default(0)
  unitsReceived      Decimal @default(0)
  purchaseValueMinor BigInt  @default(0)
  unitsWrittenOff    Decimal @default(0)
  writeOffValueMinor BigInt  @default(0)
  closingQuantity    Decimal @default(0)
  // @@unique([stockLocationId, inventoryItemId, day])
  // @@index([organizationId, day])
}
```

`MonthlyItemMetrics` has the same shape at month grain and is derived from the daily table.
`FinancialPeriodSummary(organizationId, stockLocationId?, periodType, periodStart)` holds
`revenueNetMinor`, `cogsMinor`, `grossProfitMinor`, `purchaseValueMinor`, `writeOffValueMinor` for
`MONTH`, `QUARTER`, and `YEAR`.

### 8.2 Refresh strategy

**Recommendation: plain PostgreSQL incremental rollups on a watermark.** No new infrastructure.

A scheduled worker holds a `RollupWatermark(rollupName, lastProcessedAt, lastProcessedMovementId)`,
selects movements and sales lines after the watermark, upserts affected `(location, item, day)`
buckets, and advances the watermark. Idempotent by construction — reprocessing a window recomputes
the same buckets rather than adding to them. A `rebuildRollups(from, to)` command exists from day
one and is exercised in tests.

TimescaleDB continuous aggregates are genuinely a better fit for this data shape and are the
**documented escalation path**, not the starting point. The reasons to wait are concrete: CI runs
stock `postgres:16`, the extension constrains hosting choices, and the existing blueprint already
established the principle of not adopting specialist infrastructure before measured need (the same
call made for OpenSearch). Record an explicit trigger to revisit: *a full-year rollup refresh
exceeding 60 seconds, or the movement ledger passing 50 million rows.*

### 8.3 The live view

The live stock and same-day sales tiles read **Tier 1 directly** for the current day and Tier 2 for
prior days, unioned. Today's row count is bounded by one day of trading, so this is fast, and it
means the live figures are never stale relative to a rollup schedule.

Freshness mechanism: TanStack Query `refetchInterval` of 10–15 seconds on the live tiles only.
Server-sent events are the upgrade path; WebSockets are not needed for a dashboard that changes a
few times a minute.

### 8.4 The analytical questions, and what answers them

| Question the manager asks | Source | Form | History needed |
|---|---|---|---|
| How much is in stock right now? | `StockBalance` | Stat tile | none |
| What expires soon? | `StockLot.expiryDate` bucketed | Status-coloured table + tiles | none |
| What sold today / this week? | Tier 1 today + `DailyItemMetrics` | Stat tile + line | days |
| What is my best seller? | `DailyItemMetrics` ranked | Horizontal bar | ~1 week |
| What earns the most (not just sells most)? | `grossProfitMinor` ranked | Horizontal bar | ~1 week |
| What should I reorder? | velocity × lead time vs. on-hand | Ranked table | 2–4 weeks |
| What did I make this month/quarter? | `FinancialPeriodSummary` | Hero figure + table | From first sale; show period-to-date coverage |
| When in the year does this sell? | `MonthlyItemMetrics`, 24 months | Heatmap | **12+ months** |
| Is this week better than last year's? | `DailyItemMetrics` YoY | Diverging bar | **12+ months** |

**Reorder suggestion** is a pure function, and it is the feature that makes this portal worth
buying in year one: `suggest = max(0, (dailyVelocity × (supplierLeadTimeDays + safetyDays)) − onHand
− onOrder)`, downweighted when remaining shelf life will not cover the sell-through period.
Deterministic, explainable, and fully unit-testable. No forecasting model.

**Seasonality index** per item per ISO week: that week's share of the trailing 52-week total,
normalised so 1.0 is average. This is the "when was this a top seller last year" answer, and it is
again a pure function over `MonthlyItemMetrics` / `DailyItemMetrics`.

### 8.5 The cold start — no historical backfill

**Decided: customers will not have importable prior sales history. Opening inventory seeds stock
and value; sales history fills forward from cutover.** This is a consequential product constraint in the
plan, because the headline selling point — previous-year purchasing patterns — cannot produce a
real answer for roughly twelve months after a customer starts trading.

This limits historical comparisons, not current analytics. Sales, revenue, margin and expiry
views work from the first valid facts, with partial-period and completeness labels. Descriptive
reorder rules can become useful earlier than a year, but are not promised as proven purchasing
predictions. Year two progressively supplies comparable periods; it does not automatically provide
two full years of evidence. Initial setup effort is the primary adoption risk. Three things follow.

**1. Every metric declares its own sufficiency.** Analytics responses carry the window they were
computed over, not just a number:

```ts
interface MetricWindow {
    from: string;              // ISO date
    to: string;
    observedDays: number;      // days with at least one movement
    requiredDays: number;      // what this metric needs to be trustworthy
    sufficient: boolean;
}
```

`sufficient` is computed in the domain package as a pure function, never guessed in the UI. A
seasonality index over eleven weeks is not a seasonality index, and the API must say so rather than
returning a confident-looking curve.

**2. The UI leads with what works today.** The dashboard is ordered by time-to-value, not by
ambition: live stock and expiry risk (useful hour one), then today/this-week sales (day one), then
best sellers and margin ranking (available immediately with a short-window label), and period-to-date
gross profit from the first costed sale. Reorder suggestions require sufficient coverage and inputs.
Year-over-year and seasonality panels are present but render an
explicit **"needs N more weeks of data"** state with the current progress — never an empty chart or
a flat zero line. An empty axis reads as "this product is broken"; a progress state reads as "this
is accruing."

**3. A seeded demo organization shows year two.** A separate, clearly-labelled demo organization,
generated by the mock OmniStock engine (§6.4) over a simulated two-year timeline, exists so the full
analytics story can be shown to a prospect on day one. It is generated by the *same* code path as
real sales — seeded, deterministic, and never mixed with a real tenant's data. It is not a
fixture file of pre-computed charts: it posts through the shared sales services and the real
rollups, so the demo cannot drift away from what the product actually does.

**What we do not do:** no synthetic "estimated history", no extrapolating a year from three weeks,
and no borrowing another tenant's data as a baseline. A fabricated trend on a screen a manager uses
to commit real purchasing money would be worse than no trend at all.

Because the rollup schema is year-ready from day one (§8.1), nothing needs re-engineering when the
history does accrue — the same queries simply start returning `sufficient: true`. And if a customer
ever requests historical import, that is separate future scope requiring cutover and source
reconciliation. External POS import is not a launch dependency for our own checkout.

## 9. Backend architecture

### 9.1 Service boundary

Inventory lives in the **existing Express service**, not a new one. It shares session, tenancy,
rate-limit, error-handling, and request-context middleware, and it deploys as one unit. The
blueprint defers microservice extraction, and there is no reason to pay that cost now.

It is, however, kept self-contained under `packages/api/src/modules/inventory/**` so that extraction
later is a move rather than a rewrite.

### 9.2 Layering — and a correction to the current pattern

The vendor catalog currently puts substantial business logic inside controllers
(`product-version.controller.ts` contains SKU generation, effective-status computation, and
conflict mapping). That is the main obstacle to the stated testability goal, because none of it can
be tested without an HTTP request and a database.

The inventory module uses a strict layering, and this is a non-negotiable review gate:

```text
route        -> wiring only
validator    -> Zod schema imported from @inventory-system/contracts
controller   -> HTTP only: parse request, call service, shape response. No branching on domain rules.
service      -> orchestration, transactions, authorization. Knows Prisma. Knows nothing about HTTP.
repository   -> Prisma queries. No business rules.
domain       -> pure functions. No Prisma, no Express, no I/O, no Date.now().
```

`Date.now()` is injected as a clock, so period boundaries and expiry windows are testable without
faking system time.

### 9.3 `packages/inventory-domain`

A new package holding the logic that must be provably correct:

- `allocateLots(request, availableLots, strategy)` — FEFO/FIFO allocation
- `projectBalance(movements)` — fold to a balance
- `computeCogs(allocations)` and `computeMargin(net, cogs)`
- `allocateLandedCost(lines, freight, other)` — with exact remainder distribution
- `selectEffectivePrice(prices, at)`
- `bucketExpiry(lots, at, buckets)`
- `suggestReorder(velocity, leadTime, onHand, onOrder, shelfLife)`
- `seasonalityIndex(monthlySeries)`
- `periodBoundaries(periodType, at, timezone)`

Every one is a pure function over plain data. They are table-driven unit tested with no database,
no server, and no mocks, and they run in milliseconds. This package is the single highest-value
testability decision in the design.

### 9.4 Concurrency and integrity

- Balance updates take `SELECT ... FOR UPDATE` on `(location, item, lot)` inside the movement
  transaction. Two concurrent new sales of the last unit cannot both succeed. Recovered fiscal
  facts may expose a discrepancy; they are not a negative-stock override for new-sale authorization.
- Lot allocation reads under the same lock.
- Shared sale operation IDs and persisted fiscal outcomes enforce idempotency across retries.
- Document numbering per organization and location uses a dedicated sequence row taken under lock,
  because gaps and duplicates in invoice numbering are an accounting problem.
- A nightly integrity check asserts `sum(StockMovement.quantityDelta) == StockBalance.quantityOnHand`
  for every key and reports drift.

### 9.5 API surface

```text
GET    /api/v1/inventory/context
GET    /api/v1/inventory/locations
CRUD   /api/v1/inventory/suppliers
CRUD   /api/v1/inventory/items
GET    /api/v1/inventory/items/:id/lots
GET    /api/v1/inventory/stock                     ?locationId&categoryId&lowStock&expiringWithinDays
GET    /api/v1/inventory/movements                 ?itemId&locationId&from&to  (paginated)
POST   /api/v1/inventory/adjustments
CRUD   /api/v1/inventory/goods-receipts            + POST :id/post
CRUD   /api/v1/inventory/prices
CRUD   /api/v1/inventory/sales-documents           + POST :id/post, POST :id/void
POST   /api/v1/inventory/sales/prepare             (our POS shared lifecycle; reserve/commit/release contracts in §6.2)
GET    /api/v1/inventory/reconciliation            (sale/fiscal recovery discrepancies; no external-item mapping)
CRUD   /api/v1/inventory/counts                    + POST :id/post
CRUD   /api/v1/inventory/transfers                 + POST :id/post
GET    /api/v1/inventory/analytics/overview        ?locationId&from&to
GET    /api/v1/inventory/analytics/sales-trend     ?granularity=day|week|month
GET    /api/v1/inventory/analytics/top-items       ?metric=units|revenue|profit
GET    /api/v1/inventory/analytics/seasonality     ?itemId&years=2
GET    /api/v1/inventory/analytics/expiry-risk
GET    /api/v1/inventory/analytics/reorder-suggestions
GET    /api/v1/inventory/financials/summary        ?periodType=MONTH|QUARTER|YEAR&year
GET    /api/v1/inventory/financials/export         (CSV)
```

Every response type is a Zod schema in `@inventory-system/contracts`, inferred on both sides. One
schema, two consumers — the API validator and the frontend form/query. This removes an entire class
of drift bug and is the reuse win that matters most.

## 10. Frontend architecture

### 10.1 Reconciliation first

As agreed, `main`'s frontend stack is reconciled onto `develop` before the inventory portal begins.
`main` already carries what this product needs and `develop` lacks: `@inventory-system/contracts`
(Zod), TanStack Query, TanStack Form, Radix primitives, Storybook with the a11y and Vitest addons,
MSW, `nuqs`, and `zustand`, plus a feature-sliced `src/features/**` layout. Building the inventory
portal on `develop`'s current plain-fetch and context stack would mean writing the weakest possible
foundation for a product that is mostly tables, forms, and charts.

This reconciliation is PR 01 and updates the Vendor Portal decision log, since VPD-009 explicitly
excluded `main` and that exclusion is now being revisited on purpose.

### 10.2 App and package layout

```text
apps/
  vendor-portal/
  inventory-portal/                      new Next.js app, same shell conventions
packages/
  api/            src/modules/inventory/**
  contracts/      inventory schemas alongside catalog schemas
  database/
  inventory-domain/                      pure domain logic
  ui/             atoms / molecules / organisms — shared by both portals
```

A separate app rather than a route group in `vendor-portal`: the two portals have different
navigation, different entitlements, and different audiences, and a manager who only bought
inventory should never load vendor catalog code.

### 10.3 Atomic structure

The UI package already follows atoms/molecules. It gains organisms:

| Level | Members |
|---|---|
| atoms | Button, Input, Select, Label, Badge, Skeleton, Spinner, Textarea |
| molecules | Card, Dialog, Sheet, Alert, Toast, Pagination, EmptyState, **StatTile**, **Meter** |
| organisms | **DataTable**, **FilterBar**, **ChartCard**, **TrendChart**, **BarChart**, **StackedBarChart**, **HeatmapChart**, **Sparkline** |
| templates | `DashboardShell` (already on `main`), `AnalyticsPageTemplate` |

Feature slices in the app (`features/stock`, `features/receiving`, `features/sales`,
`features/analytics`, `features/financials`), each with `components/`, `hooks.ts`,
`query-options.ts` — matching the convention `main` already established.

The rule that makes this reusable: **no feature file imports a charting or table library
directly.** Features import `DataTable` and `TrendChart` from `@inventory-system/ui`. Swapping the
underlying library later becomes a change inside one package.

## 11. Library selection

Researched against maintenance, licence, bundle behaviour, and fit with the existing
Tailwind + Radix + TanStack stack.

### 11.1 Tables — TanStack Table v8 + TanStack Virtual

**Chosen.** MIT, headless, no community/enterprise split, and the entire feature set is free.
Headless matters specifically here: it supplies sorting, filtering, grouping, and pagination logic
while the existing design system supplies every pixel, so tables look like the rest of the portal
instead of like a grid vendor's theme. It is also the same family as TanStack Query and Form, which
`main` already adopted, so the team learns one set of idioms.

Rejected: **AG Grid** — the features an inventory product would actually want from it (row
grouping, pivots, Excel export) are Enterprise-licensed at roughly $999/developer, and its own DOM
and theming layer fights an atomic design system. **MUI DataGrid** — pulls in a second design
system.

Usage rules: server-side pagination, sorting, and filtering for the stock and movement tables (both
grow without bound); TanStack Virtual only for the movement ledger drill-down; one `<DataTable>`
organism with column definitions typed from contracts.

### 11.2 Charts — Recharts, wrapped

**Chosen as the base.** MIT, the highest-adoption React-native charting library by a wide margin,
SVG-rendered, with a declarative component API that matches React idioms and — importantly for the
testability priority — renders in jsdom, so charts can be asserted in component tests rather than
only screenshotted.

**Wrapped, never imported directly.** `packages/ui/src/organisms/charts/**` owns the Recharts
dependency and exposes chart organisms with a data-shaped API. This centralises the palette and
mark rules and makes a future engine swap a package-internal change.

**Tremor** is recommended as a *source*, not a dependency. Since Vercel's acquisition the whole
library including Blocks is MIT and open source, and it is built on exactly this stack — Recharts,
Tailwind, Radix. Harvest its KPI-card and chart patterns into `packages/ui` under our own tokens
rather than adding a dependency, which keeps the design system ours and avoids a second styling
opinion.

**Apache ECharts** is the documented escalation for the specific views that need canvas rendering —
a multi-year scatter or a large seasonality heatmap past a few thousand cells. It goes behind the
same wrapper interface, imported per-chart rather than as a full bundle. Do not adopt it globally;
its bundle cost is only worth paying where canvas is genuinely required.

Rejected for now: **visx** — the most control and the best bundle discipline, but it asks you to
compose primitives yourself, which is materially more development time than this roadmap should
spend. Revisit only if the wrapper layer starts fighting Recharts.

### 11.3 Supporting libraries

| Need | Choice | Why |
|---|---|---|
| Server state | `@tanstack/react-query` | Already on `main`; caching, polling for live tiles, request cancellation |
| Forms | `@tanstack/react-form` + `zod` | Already on `main`; the same Zod schema validates on the server |
| URL filter state | `nuqs` | Already on `main`; date range/location/category in the URL makes dashboards shareable and filter state testable |
| Dates and periods | `date-fns` + `@date-fns/tz` | Pure, immutable, tree-shakeable; timezone-aware period boundaries are a correctness requirement |
| Date range picker | `react-day-picker` | Headless enough to wear the design system; pairs with Radix Popover |
| Primitives | `@radix-ui/*` | Already on `main`; accessible by construction |
| Money | **integer minor units + `BigInt`** | No `decimal.js` in hot paths; Postgres sums `bigint` natively; exact by construction. `Decimal` is reserved for quantities and VAT percentages |
| CSV export | existing `csv-stringify` | Already a dependency; no new surface |
| API mocking in tests | `msw` | Already on `main` |

Note on money: storing amounts as integer minor units with an explicit currency column is the
standard recommendation, and it avoids both floating-point error and the PostgreSQL `money` type,
which is locale-bound and not recommended. `BigInt` rather than `Int` because a year of denar
turnover in minor units will exceed a 32-bit integer.

## 12. Analytics presentation rules

The dashboard is the product, so its visual rules are part of the architecture, not a styling
detail. These follow the repository's `dataviz` skill and should be applied when the chart package
is built.

**Form follows the job.**

- Headline numbers — in stock, sold today, gross profit MTD, expiring in 30 days — are **stat tiles**
  (value, delta, sparkline), not one-bar charts. The dashboard's lead number is a **hero figure**.
- Sales over time: line; a single series may be an area.
- Best sellers: **horizontal bar in a single sequential hue**. This is a magnitude comparison, not
  an identity comparison — do not give the top ten ten different colours.
- Category mix over time: stacked bar with the categorical palette, capped at eight slots with the
  tail folded into "Other". Never generate a ninth hue.
- Seasonality: **heatmap**, week or month × year, on a single sequential blue ramp.
- Year-over-year change and performance against target: **diverging bar**, blue↔red with a neutral
  gray midpoint.
- Expiry risk uses the reserved **status palette** (good / warning / serious / critical) and always
  ships an icon and a label, never colour alone.

**Two hard rules that will come up immediately.**

1. **Never a dual-axis chart.** "Units sold and revenue on one chart" is the single most common
   dashboard mistake and it will be requested. Units and money are different scales: use two charts,
   small multiples, or index both to a common base.
2. **Colour follows the entity, never its rank.** Filtering the category list must not repaint the
   surviving series.

**Palette and modes.** Use the validated categorical order, sequential blue ramp, and blue↔red
diverging pair from the skill's `references/palette.md`. The existing portal is dark-surfaced
(`slate-900`), so the **dark column is the primary mode here** and must be validated against the
actual surface colour — dark mode is a selected set of steps, not an inverted light palette. If
brand hues are substituted, run `scripts/validate_palette.js` and fix every FAIL before shipping;
do not reason about colourblind separation by eye.

**Always present:** a legend for two or more series, direct labels at four or more, a table view of
every chart's underlying data, and a hover crosshair with tooltip on every time series. The table
view is not just accessibility — for an inventory manager it is frequently the thing they actually
want to read.

## 13. Testing strategy

Testability was named a top priority, so it is designed in rather than added.

| Layer | Tool | Covers | Speed |
|---|---|---|---|
| Domain unit | Vitest, table-driven | Allocation, COGS, landed cost, price selection, expiry buckets, reorder, seasonality, period boundaries | ms, no I/O |
| Contract | Vitest | Zod schemas parse and reject correctly; one definition, both sides | ms |
| API integration | Jest + supertest + Dockerized Postgres | Tenancy isolation, ledger invariants, transactions, idempotency, role-based cost redaction | seconds |
| Component | Vitest + Testing Library + MSW | Feature views against mocked contracts | seconds |
| Visual and a11y | Storybook + `addon-a11y` + `jest-axe` | Chart and table organisms in both colour modes | seconds |
| Performance | Seeded benchmark | 1M movements, 10k items, 3 locations, 2 years | minutes, gated |

**The golden-dataset test is the release gate for analytics.** Seed a fixed, hand-computed two years
of receipts, price changes, sales, write-offs, and counts — produced by the mock generator at a
pinned seed — then assert every rollup, every analytics endpoint, and every financial figure to the
exact denar. A product sold on its analytics cannot ship on the hope that its aggregates are right.

Three more non-negotiable suites, following precedent already set in this repository:

- **Adversarial tenancy:** every inventory endpoint gets a cross-organization and cross-location
  denial test.
- **Ledger integrity:** after any generated sequence of operations,
  `sum(movements) == balance`, and `rebuildBalances` reproduces the projection exactly.
- **Sale/fiscal resilience:** duplicates produce one sale, concurrent tills cannot reserve the
  same final unit, changed prices are revalidated, and unknown item IDs fail before fiscalization.
  Lost responses and delayed fiscal outcomes reconcile without duplicate receipts or stock effects;
  backdated corrections reach the correct rollup buckets.

Two smaller but easily-missed cases, both of which would corrupt figures a manager trusts:

The 2026-09-05 requirements also add release cases: opening import replay does not duplicate stock
or purchasing; missing receipt cost blocks posting; bulk costs allocate exactly through partial
sales/returns; missing confirmed price and insufficient stock block new sales; concurrent tills
cannot both reserve the final unit; completed fiscal exceptions remain captured; price-only
corrections move no stock; spoiled/held returns cannot be sold. Pending POS failure semantics and
correction-period policy must have acceptance cases before their implementation begins.

- **Sufficiency:** a metric with less than its `requiredDays` of history returns
  `sufficient: false`, and the analytics UI renders the progress state rather than a chart.
- **Display conversion:** EUR is applied once to a final total and never to summed line items;
  a converted figure never round-trips into storage; financial exports contain no EUR column.

## 14. Decisions taken and questions still open

### Resolved

1. **Currency — MKD ledger, EUR display lens.** MKD is the only transactional currency. EUR is a
   presentation-layer conversion on the dashboard, at a configured and attributed rate, never
   written to storage and never present in statements of record. See §5.3.1.
2. **Timezone — `Europe/Skopje`,** carried per `StockLocation` so a future cross-border location
   needs no migration. All period boundaries are computed in the location's timezone.
3. **Our own POS, after inventory.** Shared sales contracts and a mock till come first; fiscal
   printer protocol feasibility is researched early. External POS integrations are out of scope.
4. **Historical backfill — none.** Customers are not expected to have importable history. All
   analytics accrue forward from go-live, every metric declares its own sufficiency, and a seeded
   demo organization carries the mature story until real data exists. See §8.5.
5. **e-Faktura — required at launch, to the UJP JSON specification.** Document types 100, 110, 120, 160 and
   170; client-side JWS signing only; two-step verified accept/reject on incoming invoices. See §7.
6. **EUR display rate — sourced from UJP.** `POST /api/v1/currency-exchange/rate` returns the
   official NBRM middle rate, dated and attributable, with the manual setting kept as a fallback.

### Still open

The founder's 2026-09-05 answers establish opening inventory, required bulk purchase cost,
price-before-sale, strict new-sale stock checks, correction/return workflows, operational analytics
and e-Faktura at launch (IPD-022–IPD-026). Further answers choose our own POS after inventory,
batch-only or all-batch price changes, configurable allocation, and staff receiving-cost access
under delegated judgment (IPD-027–IPD-030). Still unresolved: first printer model/firmware/test
device, POS offline scope and batch-label/selection UX, financial costing method, and correction
period/export policy. Stock rotation settings do not establish actual retail batch picking.

1. **Scale.** Expected SKUs, locations, and transactions per day. This sets the escalation trigger
   for TimescaleDB and the size of the performance benchmark. *Blocks only the benchmark's target
   numbers; the mock generator can produce any volume in the meantime.*
2. **Is the inventory organization always also a vendor organization?** If some customers buy only
   the Inventory Portal, registration must create an organization with no `VendorProfile` — worth
   confirming the onboarding path exists. *Blocks the entitlement PR.*
3. **e-Faktura legal and integration verification.** Confirm current obligations and supported
   API/certificate behavior (§7.2). e-Faktura is a product launch requirement; the technical proof
   blocks release readiness even if a statutory mandate date remains uncertain.

## 15. Ordered roadmap

Backend-first with separate frontend pull requests. Every branch is `codex/`-prefixed, **branches
from `develop` and opens its pull request against `develop`**, merged strictly in order — matching
the convention already used for the Vendor Portal. `main`'s frontend refactor has been merged into
`develop` (see IPD-011), so `develop` is the single base for all inventory work.

| # | Branch | Purpose |
|---|---|---|
| 00 | `codex/inventory-00-architecture` | This document, the inventory decision log, and `docs/inventory-portal-handoff.md` |
| 00a | `codex/inventory-00a-integration-proofs` | Official fiscal-printer protocol and test-device proof; e-Faktura signing/submission proof; no external POS integration |
| 01 | `codex/inventory-01-entitlement` | Seed the `inventory` Portal row, subscription and access middleware, roles, `/context`, app shell |
| 02 | `codex/inventory-02-locations-suppliers` | `StockLocation`, `Supplier`, org settings incl. display currency, org scoping, seeds |
| 03 | `codex/inventory-03-items` | `InventoryItem` with the catalog/external CHECK invariant, trigram search, catalog sync |
| 04 | `codex/inventory-04-ledger` | `packages/inventory-domain`, `StockMovement`, `StockLot`, `StockBalance`, projection, concurrency and integrity tests |
| 04a | `codex/inventory-04a-opening-stock` | Guided opening setup/import and preview UI, required costs, idempotent posting, saved progress and cutover reconciliation; selling release follows PR 06 |
| 05 | `codex/inventory-05-receiving` | Required unit-or-bulk-total cost entry, expiry, exact landed layer values, receipt cancellation/reversal and cost corrections |
| 06 | `codex/inventory-06-pricing-vat` | Effective-dated item/batch prices, explicit batch/all-batch change scope, previous-price reuse and confirmation before release |
| 07 | `codex/inventory-07-sales-manual` | `SalesDocument`, FEFO/FIFO allocation, COGS capture, void as compensation |
| 08 | `codex/inventory-08-sales-contract-mock` | Shared sale lifecycle contracts, seeded generator, fake OmniStock till and fiscal-adapter simulator |
| 09 | `codex/inventory-09-sales-lifecycle` | Idempotent reserve/commit/release/recovery foundation for our future POS; no external-code mapping |
| 09a | `codex/inventory-09a-sales-corrections` | Partial customer/supplier returns, sales value/quantity corrections, original allocation links, damaged/spoiled disposition |
| 10 | `codex/inventory-10-counts-transfers` | Stock counts and inter-location transfers |
| 11 | `codex/inventory-11-rollups` | Daily and monthly metrics, watermarked refresh worker, rebuild command, **golden-dataset test** |
| 12 | `codex/inventory-12-analytics-api` | Analytics endpoints, seasonality, reorder suggestions, **`MetricWindow` sufficiency** |
| 13 | `codex/inventory-13-financials-api` | Period summaries; month, quarter, year gross profit; MKD-only CSV export |
| 13a | `codex/inventory-13a-efaktura-foundation` | UJP codelist sync, `EInvoiceCredential`, server-time offset, JSON builder, totals arithmetic to UJP rounding order |
| 13b | `codex/inventory-13b-efaktura-outgoing` | Client-side JWS signing, send, EUID/QR storage, storno and correction, awaiting-signature worklist |
| 13c | `codex/inventory-13c-efaktura-incoming` | Incoming document pull, receipt matching, two-step verified accept/reject, purchase VAT totals |
| 14 | `codex/inventory-14-demo-dataset` | Seeded demo organization through shared sales services, without real fiscal printing (§8.5) |
| 15 | `codex/inventory-15-ui-primitives` | `DataTable`, `FilterBar`, chart organisms, palette tokens, validator run, Storybook coverage |
| 16 | `codex/inventory-16-ui-stock` | Stock list, item detail, lot and expiry views, counts, adjustments |
| 17 | `codex/inventory-17-ui-receiving-sales` | Receiving and manual sales entry, reconciliation queue |
| 17a | `codex/inventory-17a-ui-efaktura` | Faktura-needed dialog on sale, issue form, signing hand-off, incoming review and two-step accept/reject screens |
| 18 | `codex/inventory-18-ui-analytics` | The analytics dashboard, including insufficient-history states and the EUR display toggle |
| 19 | `codex/inventory-19-ui-financials` | Financial period views and export |
| 20 | `codex/inventory-20-alerts` | Low stock, expiry, and reorder alerting |
| 21 | `codex/inventory-21-hardening` | Accessibility, performance benchmark, adversarial tenancy, release evidence |

PR 08 precedes the shared sale lifecycle so PR 09 is tested against reproducible retries,
last-unit contention, price changes and interrupted fiscal outcomes. It also supplies analytics
test data. Once inventory is usable, a separate POS phase adds checkout/scanning/payments, till
sessions and cash reconciliation, one supported fiscal-device bridge, then field recovery testing.
A retail go-live that depends on our checkout requires that POS phase; inventory-only readiness
does not mean a shop can replace its till. See the estimate in the printer research note.

The frontend-reconciliation PR that previously sat at position 01 is **done and merged** into
`develop`; it is no longer part of this roadmap.

Each pull request follows the standard already set in §17 of the Vendor Portal blueprint.

## 16. Success measures

- Time and manual effort from signup to reconciled opening inventory and first successful sale;
  measure setup completion and identify abandonment steps with the pilot customer.
- Every posted opening/receipt line has explicit purchase cost; bulk-total entry requires no
  manual per-unit calculation. Every newly authorized sale has confirmed price and sufficient
  sellable quantity. Recovered fiscal discrepancies are visible and reconciled separately.
- Purchase/sale corrections and returns preserve original facts, quantity/value conservation and
  operator attribution. e-Faktura succeeds on a supported integration before launch.

- Time from receiving a delivery to it being visible in stock, under one minute.
- Ledger integrity: zero drift between movements and balances across a full release cycle.
- Analytics correctness: golden-dataset assertions exact to the denar, every run.
- Rollup freshness: prior-day metrics available within five minutes of midnight, location-local.
- Own-POS lifecycle: zero duplicated sales under replay, no overselling under concurrent online
  tills, and uncertain fiscal outcomes resolved without blind reprinting.
- Reorder suggestions acted on, and stock-out days per item per month.
- Expiry write-off value as a share of purchase value, trending down.
- **Time-to-first-value:** a new customer gets a decision-grade answer from the portal within the
  first week — stock accuracy, expiry risk, and best sellers — without waiting on the year-scale
  analytics.
- Zero cross-organization or cross-location authorization failures in adversarial tests.
- Dashboard time-to-interactive under two seconds at benchmark scale.
