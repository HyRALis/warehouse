# 03 — Receiving and suppliers

**Depends on:** `00-foundation.md`

## Your task

Design how opening inventory and a delivery become stock. This is where purchase cost and expiry
enter the system. Mistakes must be correctable through linked entries with visible history.

## Context that shapes the design

Cost is captured **per delivery**, not per item. The same product bought twice at different prices
produces two lots at two costs, and a sale consumes the oldest or first-expiring one. So the
receiving screen is fundamentally a **lot-creating** screen, and the design must make the
per-delivery nature obvious rather than looking like a simple quantity update.

## Screens

Design the ordinary journey as **Scan items -> Enter quantity and cost -> Receive stock** on one
working screen. Use the visible selected location as a default. Inline errors and one submission
summary replace repeated dialogs. Optional freight/reference/details expand when needed; required
fields stay visible. Internal validation steps are annotations, not additional pages.

### Goods receipt entry

Header: location received into, supplier, supplier's document reference, received date.

Line entry — the core of the screen. Per line: item (searchable, by name / SKU / barcode),
quantity, unit cost, and — for items that track them — lot code and expiry date.

**Required cost; unit or bulk-total entry.** Let the receiver choose unit cost or total purchase
cost for the entire received quantity of that item. For 200 milk cartons costing 12,000 MKD, entering
those two values must be enough; display the calculated 60 MKD/carton. Label whether supplier input
includes VAT and discounts. The system handles exact residual allocation; the receiver does no
division. Missing cost blocks posting, not saving a draft. Never turn a blank cost into zero.

Design for speed, because someone is standing at a pallet:

- Add lines by scanning a barcode or typing. Scanning is the primary path.
- Keyboard-only entry across the whole grid; tab moves sensibly, enter adds a line.
- A running total (net, VAT, gross) that updates live.
- Never silently reuse the last cost. If a cost differs materially from the previous purchase of
  the same item, say so inline — a mistyped cost is the single most damaging error on this screen
  and it affects margin until corrected through an auditable cost-correction flow.
- Expiry date entry must be fast: a date picker plus a "+N days/months" shortcut, since fresh goods
  usually arrive with a predictable shelf life.

### Landed cost

Freight and other charges are entered on the receipt and allocated across lines by value, folding
into each lot's cost. Show the allocation explicitly — the user should see what each line's cost
becomes after allocation, not just a total. Rounding remainders must be visible and must sum back
exactly to the entered total.

Show exact allocated totals and a useful unit-cost display; do not require a user to balance tiny
rounding differences manually. The original total remains authoritative.

### Opening inventory

Provide a guided first-use setup for existing stock: locations, item records, quantities, lots,
expiry, required purchase costs and selling prices. Include bulk import, preview, row-level errors,
save/resume and final reconciliation. Distinguish opening stock from a new supplier purchase.
Show progress toward the first sale and actionable missing-cost/price tasks.

### Release for sale and corrections

Received stock may be on hand but not ready for sale. Require a confirmed selling price before
release; offer **Use previous approved selling price for this item**, showing the price/date inline.
The final **Receive stock** action confirms this choice and posts/releases eligible stock together.
Do not add a separate release screen to an ordinary complete receipt. Missing prices create a
**Needs selling price** worklist task while the goods remain on hand and unavailable for sale.
Only a worker with price-management permission may enter a new price. They explicitly select **This batch only** or **All batches of
this item**, with location/quantity/price impact shown. The all-batch action supersedes conflicting
batch overrides in the selected scope. Different batch prices require a batch label/code or explicit
selection at checkout; an ordinary shared item barcode cannot distinguish them.

Provide cost correction, draft cancellation, posted receipt reversal and supplier-return flows.
Show downstream sales/transfers that affect a reversal. A cost-only correction changes value with
no stock movement. Distinguish damaged/spoiled goods held from sale, written off, or returned.

### Draft vs posted

A draft receipt writes nothing to the ledger; posting creates lots and stock movements. Make that
boundary unmistakable — posting is the irreversible act. A posted receipt cannot be edited, only
corrected by a new document. Design the posted (read-only) view accordingly, with a clear
"correct this" path rather than a disabled edit button.

**After posting, show a non-blocking document follow-up link and worklist task.** The matching flow
is designed in prompt 05; do not interrupt every delivery with an invoice dialog.
Stock must post successfully even if the tax platform is unreachable.

### Supplier list and detail

Name, ЕДБ (tax number), contact, lead time in days, active flag. Detail shows purchase history,
items usually supplied, and average lead time. Lead time feeds reorder suggestions, so make it
prominent and editable rather than a buried field.

## Permissions

Use action/location permissions from `README.md` and IPD-031. The proposed receiver preset can see
and enter receipt costs, including bulk totals, post complete receipts and reuse approved prices.
Other warehouse workers do not inherit these grants. A draft-only worker may prepare a receipt and
request authorized posting; a receiver who can post does not need a second approval.
Posted-cost correction, selling-price management, invoice acceptance and financial reports are
separate grants. Missing cost blocks posting, and price validation is repeated at submission.
Receipt-cost access does not expose general stock valuation or margin through other views/exports.

## Deliverables

Goods receipt entry (empty, partially filled, with a cost-variance warning, ready to post), the
landed-cost allocation view, the posted read-only receipt, receiver/draft-only/price-authorized variants, supplier
list and detail, and a mobile/tablet receiving layout for use at the loading bay.
