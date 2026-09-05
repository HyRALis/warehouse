# Inventory Portal plan review

Reviewed 2026-09-05. This is a review and proposed revision, not an approval or a change to accepted decisions.

**Follow-up incorporated:** The findings below record the pre-clarification blueprint. The founder
has since confirmed full opening inventory, required receipt cost with bulk-total input, confirmed
selling price before release, strict stock checks for new sales, corrections/returns/spoilage, and
e-Faktura at launch. Initial adoption centers on easy setup and reliable daily operations; current
analytics are valuable immediately. These requirements are now reflected in the blueprint and
IPD-022–IPD-026. They are planning changes, not implemented features. Staff cost permissions,
item/batch price scope, FIFO/FEFO, correction-period policy and the pre-sale POS integration choice
remain open. See [Macedonian POS research](inventory-pos-macedonia-research.md). Suggestions below
to defer e-Faktura or post ordinary receipts with unknown cost are superseded by these answers.

**Further clarification:** IPD-027–IPD-030 subsequently replace external POS integration with our
own POS after inventory, accept batch-only/all-batch price changes and configurable rotation, and
choose receipt-cost access for receiving staff under founder delegation. External adapter/mapping
recommendations below are historical, not launch requirements. The printer research note now
contains official protocol links and a conditional delivery estimate. Actual batch identification
for different prices, printer recovery, financial costing and correction-period policy still need
implementation design; the user has not asked to build the POS yet.

**Assessment:** Keep the ledger, shared platform, PostgreSQL, exact arithmetic, and pure domain functions. The blueprint is not yet ready to become a fixed implementation sequence. Its largest risks are incomplete operational and costing rules, an unproven real integration path, and a roadmap that postpones customer feedback until most of the backend exists.

The first release needs fewer reporting surfaces and more explicit rules for imperfect data. Opening inventory, receiving without final cost, late POS sales, partial returns, and outstanding purchases will determine whether managers trust the dashboard.

**Evidence and limits**

Reviewed the [architecture blueprint](inventory-portal-architecture.md), [decision log](inventory-portal-decision-log.md), receiving and stock design prompts, repository guide and backend standards, Prisma catalog/platform schema, registration/authentication code, and standards checker. The checked-out code contains the vendor portal and platform foundation; the inventory domain and inventory app described here are still planned. Findings below concern the proposed design unless explicitly described as existing code behavior. This was not a runtime audit of an implemented inventory system.

Primary-source research is linked beside the relevant finding. The UJP technical wiki could not be retrieved during this review. Its detailed signing, rounding, endpoint, rate-limit, and timestamp claims remain unverified here. The current legal commencement date and exact retention obligations were not established; the plan's statements about draft-law status and ten-year retention must not be treated as freshly verified legal facts.

**Keep these decisions**

- Append-only stock movements, transactional balance updates, and rebuild/integrity tools.
- Organization tenancy and mandatory physical locations; reuse the existing entitlement foundation.
- Snapshot transaction prices and costs, with explicit later correction events.
- One Express service, PostgreSQL first, pure costing/allocation functions, shared runtime contracts.
- Preserve valid external sales even when internal mappings or stock records are incomplete.
- Separate physical posting from e-Faktura submission; keep private keys outside the platform.
- MKD transactions, descriptive analytics, visible data sufficiency, and deterministic integration fixtures.
- Defer manufacturing, microservices, ML forecasting, full accounting, and a custom permission engine.

**P0 — decisions and invariants to resolve before ledger/sales implementation**

**1. Add opening inventory and an explicit cutover.** Blueprint §§3, 5.2, 8.5.

No historical backfill is an accepted decision. It does not address goods already on the shelves at go-live. There is no opening-stock document or workflow. Treating existing inventory as a normal receipt would inflate current-period purchasing and invent a delivery.

Add an opening-stock document with effective cutover time, item/location/lot quantities, expiry where known, cost provenance, preview/validation, and idempotent posting. Support bulk item/supplier setup and an opening-count template. Unknown costs and expiry must remain explicitly unknown. Agree which POS receipt/time starts live ingest and reconcile the first trading day to avoid overlap.

Acceptance example: import 100 existing units twice; stock becomes 100 exactly once, current-period purchase totals remain zero, and missing cost prevents a claim of final margin.

**2. Design cost finalization and corrections; immutable does not mean infallible.** Blueprint §§5.2, 5.4–5.5, 6.2; receiving design prompt.

The current model requires receipt/lot costs and non-null sales COGS, while allowing negative stock, unmatched sales, and staff receiving without cost entry. Late freight invoices and mistaken receipt costs create the same problem. These cannot all yield final COGS at posting time.

Example: three units sell before their receipt is recorded. The system has no actual lot cost to capture. Recording zero makes the margin look excellent; freezing an estimate forever makes it permanently wrong.

Add explicit valuation states such as pending, provisional, and finalized; a documented fallback policy; and append-only value adjustments linked to the original receipt, allocation, and sale line. Separate quantity movement from value-only corrections. Keep both effective and recorded times. Decide how adjustments affect an open period and an already-exported period. Reports need unresolved-cost counts/value coverage and an as-of/version marker, not just one apparently final profit figure.

Also decide the staff workflow: quantity-only receiving followed by manager valuation, or manager-prepared costs available to posting without being disclosed to staff. The current UI promise does not select a backend behavior.

This is a real inventory edge case: Odoo explicitly documents provisional negative-stock valuation and reconciliation after receipt. Its implementation need not be copied; OmniStock can preserve its append-only rule through adjustment entries. [Odoo valuation operations](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/inventory_valuation/operations_valuation.html).

**3. Separate physical lot selection from the financial costing policy.** Blueprint §5.5.

FEFO describes which goods should leave first. A normal SKU/barcode sale does not establish which physical batch actually left. Automatically consuming the earliest-expiry lot produces an estimate unless staff or the POS records lot selection. Expiry reports can otherwise say the oldest batch is gone while it remains on the shelf.

Record whether an allocation was observed or inferred. Provide explicit lot selection where operationally feasible and lot-level counts to reconcile assumptions. Define one financial cost method with the customer's accountant; do not imply that FEFO automatically establishes financial-reporting correctness. IAS 2 distinguishes specific identification from FIFO/weighted-average costing for interchangeable inventory. This is a design reference, not a determination of the customer's applicable accounting regime. [IFRS IAS 2](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/).

Keep the current gross-profit scope if desired, but identify whether exports are management estimates or accountant-reconciled figures. Define purchase cost net of recoverable tax, treatment of nonrecoverable tax and supplier discounts, and how write-offs appear alongside goods margin.

**4. Exact money needs explicit precision and residual allocation.** Blueprint §§5.2–5.5, 7.7, 11.3.

Integer posted totals are a good choice. Integer *unit* costs alone cannot represent every exact allocation. Distribute one deni of freight over three identical units: no integer per-unit uplift can sum back to one deni. Fractional quantities introduce further rounding boundaries.

Store authoritative total values for receipt cost layers and allocated movements, including residual value, or specify an exact higher-precision/rational unit-cost representation. Define quantity scale, rounding mode, rounding stage, discount meaning (per unit versus per line), partial-return rounding, and the final-unit residual rule. BigInt storage does not remove the need for exact fractional intermediate arithmetic. Returns must reverse the original allocated amount.

UJP's arithmetic examples in the plan do not themselves define decimal scale or where rounding happens. Algebraically, per-unit VAT multiplied by quantity equals VAT on the line total until rounding is introduced. Obtain authoritative precision rules and boundary examples before implementing the asserted distinction. Preserve POS-provided fiscal totals rather than silently changing them to a different rounding convention.

The configured EUR rate has a smaller precision bug: integer deni per EUR cannot exactly represent the plan's own 61.695 example. Store the rate with explicit decimal scale or a rational denominator.

Acceptance examples: three partial sales exhaust the original layer value exactly; a full return restores exactly that value; fractional quantities and discounts reconcile to document totals in minor units, including one-deni boundaries.

**5. Make POS intake a durable fact capture workflow.** Blueprint §§5.5, 6.2–6.4.

An unmatched line cannot fit the proposed required `SalesDocumentLine.inventoryItemId`. An unmatched-only sale produces no item movement to drive the rollup watermark. The contract also lacks source line IDs, source totals, original-document references for returns/voids, and a way to distinguish a changed payload from an identical retry.

Persist the authenticated source payload and normalized source lines before mapping. Separate accepted intake, mapping, stock allocation, and valuation states. Revenue can be retained while item attribution and COGS remain pending. Mapping resolution should append/link the resulting inventory effects once and invalidate the affected historical reports.

Define device/store-scoped source identity; verify whether receipt numbers are globally unique in the selected POS. The current org/system/ref constraint is sufficient only if the source guarantees that scope. Store a payload hash: same key/same content returns the original result; same key/different content surfaces a conflict instead of silently discarding a correction. Add schema version, source line IDs, fiscal totals, and original references.

Specify machine credentials with organization/location scope, rotation/revocation, durable acknowledgments, retry behavior, and import progress. The human session authorization chain does not yet define this integration identity. Distinguish valid-but-unmapped business facts from unauthorized or malformed payloads.

The mock remains valuable, but one real vendor sample and an end-to-end connector spike belong near the start. A mapper cannot solve a missing API, on-premise database access, polling, offline buffering, changed receipts, or vendor licensing restrictions. Add daily receipt count/net/VAT/gross reconciliation and feed-gap monitoring: a perfectly accurate ledger of only half the receipts is still wrong.

**6. Separate financial corrections from physical returns.** Blueprint §§5.5, 7.4, 7.8.

The current rule that voiding a document emits `SALE_RETURN` is too broad. A price-only credit changes money without returning goods. Cancelling and reissuing an invoice can leave the delivery unchanged. A damaged customer return may come back into quarantine, not sellable stock. A fiscal receipt followed by an invoice for the same sale must not subtract stock or recognize revenue twice.

Add original document and original line references, partial return quantities and limits, original allocation/cost reversal, return disposition, and links between fiscal representations of the same sale. Give financial cancellation, physical return, replacement, and supplier return separate transitions. One common document header can remain; document type alone must not imply physical movement.

Acceptance examples: a price credit changes revenue with zero stock delta; a partial return reverses only its original cost; receipt-to-invoice conversion creates no second sale; two simultaneous returns cannot exceed the quantity sold.

**7. Complete the database integrity protocol.** Blueprint §§5.2–5.3, 9.4.

`StockBalance` uses a nullable lot in its unique key. PostgreSQL normally permits duplicate keys containing null. Use a non-null allocation key, appropriate partial unique indexes, or `NULLS NOT DISTINCT` with a documented supported PostgreSQL version. README currently permits PostgreSQL 14, so PostgreSQL-16 assumptions need reconciliation. [PostgreSQL constraints](https://www.postgresql.org/docs/16/ddl-constraints.html).

`SELECT FOR UPDATE` locks existing selected rows; it does not lock a balance row that has not been created. Specify safe first-row creation and a stable item/location allocation lock, ordered locking across multiple items/lots, and bounded deadlock/serialization retries. Verify the complete transaction, not just the update statement. [PostgreSQL locking](https://www.postgresql.org/docs/16/explicit-locking.html), [transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html).

Also specify tenant-consistent foreign keys for inventory-owned records; movement-to-source-line and reversal links; idempotent post/void/count/transfer operations; enforceable posted-document/ledger immutability; and constraints for quantities, currency, lot/item compatibility, and expiry tracking. Restrict historical deletes without preventing legitimate draft edits.

Prices need non-overlapping half-open intervals `[validFrom, validTo)`, location override precedence, and an explicit interval-closing rule. Inclusive `BETWEEN` selects two prices at an adjacent boundary; saying prices are never updated conflicts with maintaining `validTo` unless supersession/closure is separately modeled.

**8. Replace the underspecified rollup watermark with durable invalidation.** Blueprint §§8.1–8.3.

A timestamp/ID cursor is not automatically commit ordered. Transaction A can create an earlier record, B can commit a later record and advance the worker cursor, then A can commit behind that cursor. UUID tie-breaking does not fix this. Sales changes, value corrections, and unmatched-line resolution also need to drive recomputation independently of stock movements.

Write dirty-bucket work or outbox events in the same transaction as the source fact. Process pending committed work with a lease/version or locking protocol that cannot erase a concurrent new invalidation. Recompute buckets and mark precisely the claimed work complete atomically; support crashes, retries, and multiple worker instances. PostgreSQL is sufficient for this design; a new broker is not required. The transactional-outbox principle addresses the database/event dual-write gap. [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

Late movements change not only the original day's activity but subsequent closing balances. Recompute the affected balance range or derive closing balances from suitable checkpoints. Monthly `closingQuantity` is the period's last closing balance, never the sum of daily closings. Zero-sale days still need correct balances. Define midnight handover between live queries and rollups without temporary missing/double-counted totals, and report freshness for late changes to prior days.

Acceptance examples: deliberately inverted transaction commit order loses no fact; a worker crash produces no duplicate totals; a receipt dated last week corrects later closing balances and dependent monthly summaries; an unmatched-only receipt appears in revenue before item mapping.

**P1 — operational workflows to add before a customer pilot**

| Gap | Minimum useful addition | Consequence if omitted |
|---|---|---|
| Reorder formula uses undefined `onOrder` | Lightweight purchase commitments: supplier/item/location, ordered and remaining quantities, expected arrival, partial receipt, cancel/close | Managers reorder goods already on the way |
| Item-level settings are too coarse | Supplier-item and location-item settings for lead time, buy unit, pack multiple, minimum order, safety/reorder settings | Different stores and suppliers get the same unsuitable recommendation |
| Pack and weighted goods | Base stock unit, purchase/sale conversion snapshot, allowed quantity precision, barcode aliases; implement only formats the pilot uses | A case of 12 is booked as one piece, or weight becomes a product identifier |
| Concurrent physical counting | Count timestamp and expected snapshot, uncounted versus zero, overlap handling; freeze counted scope or reconcile/recount after intervening movements | Posting an old count erases legitimate sales |
| Transfers have no transit | Dispatch/receive states, partial receipt, discrepancy/loss handling, authorization at both ends, conserved cost and lot lineage | Destination can sell stock still on a truck |
| Lot is tied to one location | Shared batch identity plus location holdings, or linked destination lots retaining original provenance | A transferred lot contradicts its location or loses traceability |
| Expiry has no availability policy | Date-only expiry, unknown expiry, sellable/held/damaged status, expiry cutoff and override rules | FEFO may allocate an expired or blocked lot |
| Returns/write-offs only partly specified | Visible workflows, reason, actor, evidence and valuation effects; batch trace lookup if the pilot needs recalls | Exception handling happens outside the system |
| Receiving assumes one invoice/receipt | Line-level matching across partial deliveries and multiple invoices, mismatch tolerances, unallocated charges and nonstock invoice lines | The proposed `goodsReceiptId` link cannot represent normal supplier billing |
| History sufficiency counts movement days | Separate calendar coverage, open days, source feed health, item active dates, stockout availability, and cost completeness | Zero-demand days disappear, outages resemble no sales, stockouts depress apparent demand |
| Recovery and operations absent | Backup/PITR policy, a demonstrated restore, pending-work monitoring, replay/rebuild runbooks, audit/export retention policy | Append-only data is still lost after infrastructure failure |

Purchasing approvals can remain deferred while simple outstanding orders are tracked. Replenishment systems commonly consider incoming/outgoing quantities and arrival lead times; these are useful input requirements, not a reason to copy a full ERP. [Odoo reordering rules](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/replenishment/reordering_rules.html).

GS1 documents barcodes carrying weight, lot, and expiry attributes; a single undifferentiated string is not a complete scanning specification. Start with the actual labels the first customer receives. [GS1 DataBar](https://www.gs1.org/standards/barcodes/databar).

Odoo also documents the count-to-post movement race. For example, count 98 against expected 100, then sell three before posting: the correction remains minus two, leaving 95. Replacing the current balance with the old count of 98 is wrong. A recount/conflict workflow may be simpler than fully concurrent counting for the pilot. [Odoo inventory adjustments](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html?msockid=15f17c752e4f68c13fc26a952f22699e).

For analytics, distinguish a valid comparison with last year's observed period from evidence of repeatable seasonality. One year's sales do not demonstrate a repeated seasonal pattern. Specify ISO-week/year alignment, week 53, leap days, closed days, promotions, and stockout caveats. Show month-to-date values immediately with completeness labels; a completed month is not required to calculate MTD.

**e-Faktura — keep the accepted scope, prove feasibility earlier**

IPD-017 through IPD-021 are accepted decisions. This review proposes an early technical gate and customer-led release staging, not silently reversing them.

UJP's notice dated 22 May 2026 confirms the official extension and directs users to the project wiki for downloads. It does not establish that an arbitrary third-party SaaS origin can invoke the extension. That must be demonstrated. [UJP official extension notice](https://www.ujp.gov.mk/m/javnost/soopstenija/pogledni/1247?print=1).

Before the full invoicing implementation, demonstrate one supported certificate/browser/OS combination signing a document from the intended application origin and successfully submitting it in the test environment. Capture the official spec version, complete precision rules, authorized-signatory setup, and incoming acceptance requirements. Do not use third-party extension downloads.

Add the following to the design:

- Separate local workflow state (awaiting signature, submitting, outcome unknown, needs re-signing, failed) from UJP's verbatim business status. These describe different facts.
- Signed-payload binding: the returned JWS must match the server-approved document/version, tenant and requested action; editing the draft invalidates the signing request. Recheck authorization at submission.
- Persist submission attempts and signed bytes. If UJP accepted but the response was lost, resolve the remote outcome before resending. Do not assume send is idempotent without evidence.
- The plan's five-minute signed timestamp window, if confirmed, means a queued signed document can expire; backoff cannot refresh a timestamp without another signature. Model that operator flow.
- Durable pending work, status polling, codelist refresh and per-user throttling shared across all relevant calls and app instances. This already exceeds the claim that only a rollup worker is needed; one process may handle several persisted job types.
- Stable line/document correction references and retained status/verification history. Preserve the exact invoice version reviewed before an accept/reject action. Match inbound invoices independently of physical receipt completion.
- Type-specific counterparty validation: `customerTaxNumber` required for all invoices and unconditional `counterpartyEdb` need reconciliation with natural-person document type 170. Verify official requirements instead of guessing.
- Clarify how purchase VAT totals relate to recoverability, exemptions and nonstock expenses. This is accounting behavior, not just another integration endpoint.

If the pilot requires e-Faktura at launch, this gate becomes part of the critical path. Otherwise propose an inventory pilot using the customer's existing invoice process, while retaining e-Faktura in the agreed product roadmap. Do not decide this solely from an unverified legal date.

**What to simplify or delay**

| Current proposal | Recommendation |
|---|---|
| All backend phases before working inventory screens | Deliver vertical workflows with their UI and tests; validate receiving, scanning and reconciliation early |
| Daily, monthly, and month/quarter/year summary tables immediately | Begin with one daily grain and indexed aggregation; add materialized summaries after measurements justify their refresh/invalidation burden |
| Large chart catalog and dedicated year-scale dashboards | Start with stock/expiry, sales, provisional/final margin and actionable reorder lists; add specialized charts as customers accumulate data |
| A rich two-year fake till that also supplies the golden oracle | Keep a small independent hand-computed correctness fixture, a reusable transport simulator, and a separate scale/demo generator; expected values must not come from production calculation code |
| Automatic catalog sync justified as avoiding all joins | Start with an explicit catalog import/snapshot and refresh policy unless live sync is required; multi-table analytics still requires joins |
| Mandatory virtualization for the ledger | Benchmark paginated rendering first; add virtualization when page size/render cost warrants it |
| Early partitioning implied by retention | Specify retention/archiving and measure table growth first; the referenced partition design is not actually present in §8 |
| Multiple future chart/database engine escape routes | Keep a short measured trigger, avoid engineering unneeded adapters now |

Effective price history remains useful for manual sales and scheduled pricing, but transaction price snapshots are what preserve historical margin. Price history alone cannot make margin correct. A separate inventory app is defensible for entitlements and product navigation; code splitting alone is not sufficient justification, and duplicated authentication/deployment work should be budgeted.

**Repository and document inconsistencies to fix in PR 00/01**

- Inventory-only signup is a concrete missing path: `packages/api/src/controllers/auth.controller.ts:35` creates a legacy Vendor, vendor subscription and VendorProfile. `packages/api/src/auth.ts` disables user-created organizations. Add inventory onboarding, invitation destinations and correct app URLs without manufacturing a vendor identity.
- The planned `packages/api/src/modules/inventory/**` repositories conflict with `tools/check-standards.mjs:151`, which recognizes only `packages/api/src/repositories/` as permitted database importers. Choose the current layout or update the standards/checker together; do not add a baseline exemption.
- Blueprint §9.2 says a service knows Prisma; active backend standards prohibit Prisma types leaking into service signatures. Specify a repository transaction abstraction consistent with the standards.
- Ingest schema ownership is duplicated between contracts (§6.3) and domain payload layout (§6.4). Keep the public schema in contracts and domain parsing/calculation separate.
- ProductVersion is vendor-owned, editable, and does not itself contain the proposed item `name`/`categoryId` fields; those live partly on Product. Define catalog visibility across organizations, stable stock identity, relinking/refresh behavior and transaction-time item/category snapshots. Do not bypass tenancy to implement cross-vendor sourcing.
- §10.1 still calls frontend reconciliation future PR 01, while the decision log/roadmap says it is complete. Refresh the baseline and completion markers.
- References to §7A and the promised inventory handoff document do not resolve to matching content/files in this checkout. The referenced dataviz skill/palette validator is also not present in the searched repository files; supply it or replace the dependency with explicit accessible design requirements.
- Scope/header dates and proposed/accepted statuses disagree in places. Maintain one accurate decision/release boundary before generating implementation tickets.

**Proposed delivery order**

1. **Pilot contract and risk proofs:** name the customer/workflow; collect sample supplier invoices, labels and POS receipts; prove the real POS access path and e-Faktura signing if required. Resolve P0 cost, correction, identity and precision rules; repair stale plan/standards references.
2. **Usable stock foundation:** inventory-only onboarding, location/role access, item/supplier import, opening stock, ledger invariants, stock/lot screen and scanner entry. Gate: opening inventory reconciles exactly.
3. **Usable receiving and corrections:** receipt entry, staff/manager cost workflow, landed value allocation, unknown-cost worklist, counts, write-offs and required transfer flow. Gate: a real delivery can be received and a mistake corrected without losing quantity/value history.
4. **Real sales capture:** durable POS intake, source reconciliation, allocation/valuation, partial returns/credits, required manual entry and mapping UI. Gate: one real trading day's source receipt totals and inventory effects reconcile, including duplicates and late arrivals.
5. **Decision support:** reliable daily recomputation, freshness/completeness indicators, stock/expiry/sales/margin views, simple outstanding orders and explainable replenishment. Gate: independent golden cases agree to the minor unit and incomplete data is visibly incomplete.
6. **e-Faktura completion and expanded reporting:** fulfill accepted document types and inbound workflow on the proven integration, or move this milestone before the pilot if customer requirements demand it. Add richer period/seasonality views and the full demo when useful.
7. **Pilot release evidence:** restore drill, source-feed and worker failure recovery, tenancy/cost-redaction checks, realistic performance and keyboard/mobile usability. These checks accumulate per milestone; they are not all postponed to a final hardening sprint.

Keep PRs reviewable, but make the dependency graph follow functioning customer workflows rather than a blanket backend-first rule. No calendar estimate is credible until staffing, pilot scope, POS access and invoicing requirements are known.

**Questions to settle with the founder/customer**

The first three groups were asked in conversation; the rest are the operational follow-up checklist. Answers are still pending at the time of this review.

1. Who is the first paying customer: grocery, wholesaler, general retailer, producer, or another segment? How many SKUs, locations, tills and receipts per day? Describe their most costly recurring mistake.
2. What must work for them to start using the product, and by when? Is e-Faktura a launch condition? What does their existing software already handle adequately?
3. What are their actual purchase/sale units and labels? Cases, individual pieces, kg or litres? Do they record batches at sale? How long are goods in transit between locations?
4. Which exact POS/vendor/version is used? Can we obtain anonymized exports containing normal sales, discounts, returns and voids now? Who is responsible for restoring a disconnected feed?
5. Who knows the final purchase cost and when? Does a manager need to approve it before goods can be sold, or must receipt posting work with incomplete financial data?
6. Will an accountant use these exports? Which costing and VAT treatment do they expect, and can previously exported periods change after a late invoice? Is the product promising operational margin or accounting valuation?
7. When a customer receives a refund, do goods come back, stay with them, or get scrapped? Can one sale have both a fiscal receipt and an invoice? Can invoices be corrected without undoing delivery?
8. Can the customer provide an opening count and estimated/current cost, even without sales history? Who signs off the go-live quantities and cutover time?
9. How do they place and track orders today: phone, message, paper, software? Will they record outstanding quantities and ETA so reorder suggestions can avoid duplication?
10. Can trading pause for counting, or must counts work while tills keep selling? How often will anyone physically verify remaining quantities by expiry batch?
11. Who can adjust stock, backdate transactions, view costs, sign invoices, and accept supplier invoices? Can a manager at one location see another location's costs or company-wide totals?
12. What would make the customer renew after the first month, before any year-over-year analytics exists: fewer stockouts, less expiry loss, quicker receiving, less invoice work, or better margin visibility? What baseline will demonstrate that improvement?

**Verification performed**

Documentation/code inspection and the primary-source research above. `npm run lint` passed with three existing image-element warnings in ProductVersionManager; `npm run standards:check` passed with no new violations (116 existing baselined violations). No inventory behavior tests were run because the reviewed inventory implementation does not yet exist. The failure scenarios above are proposed acceptance tests, not claims of reproduced production defects.
