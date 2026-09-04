# 03 — Receiving and suppliers

**Depends on:** `00-foundation.md`

## Your task

Design how a delivery becomes stock. This is where purchase cost and expiry enter the system, which
makes it the origin of every margin and expiry number the product later reports. Data entered
carelessly here is wrong forever.

## Context that shapes the design

Cost is captured **per delivery**, not per item. The same product bought twice at different prices
produces two lots at two costs, and a sale consumes the oldest or first-expiring one. So the
receiving screen is fundamentally a **lot-creating** screen, and the design must make the
per-delivery nature obvious rather than looking like a simple quantity update.

## Screens

### Goods receipt entry

Header: location received into, supplier, supplier's document reference, received date.

Line entry — the core of the screen. Per line: item (searchable, by name / SKU / barcode),
quantity, unit cost, and — for items that track them — lot code and expiry date.

Design for speed, because someone is standing at a pallet:

- Add lines by scanning a barcode or typing. Scanning is the primary path.
- Keyboard-only entry across the whole grid; tab moves sensibly, enter adds a line.
- A running total (net, VAT, gross) that updates live.
- Never silently reuse the last cost. If a cost differs materially from the previous purchase of
  the same item, say so inline — a mistyped cost is the single most damaging error on this screen
  and it stays wrong in the margin figures forever.
- Expiry date entry must be fast: a date picker plus a "+N days/months" shortcut, since fresh goods
  usually arrive with a predictable shelf life.

### Landed cost

Freight and other charges are entered on the receipt and allocated across lines by value, folding
into each lot's cost. Show the allocation explicitly — the user should see what each line's cost
becomes after allocation, not just a total. Rounding remainders must be visible and must sum back
exactly to the entered total.

### Draft vs posted

A draft receipt writes nothing to the ledger; posting creates lots and stock movements. Make that
boundary unmistakable — posting is the irreversible act. A posted receipt cannot be edited, only
corrected by a new document. Design the posted (read-only) view accordingly, with a clear
"correct this" path rather than a disabled edit button.

**After posting, the e-Faktura matching dialog may appear.** That flow is designed in prompt 05;
here, just leave the seam: posting completes on its own and the invoice step follows separately.
Stock must post successfully even if the tax platform is unreachable.

### Supplier list and detail

Name, ЕДБ (tax number), contact, lead time in days, active flag. Detail shows purchase history,
items usually supplied, and average lead time. Lead time feeds reorder suggestions, so make it
prominent and editable rather than a buried field.

## Permissions

Receiving is a staff task, but **cost is manager-only**. Design a staff receiving flow that
captures quantity, lot and expiry **without** unit cost or totals, and a manager flow with the full
financial picture. These are meaningfully different screens; do not design one and hide fields.

## Deliverables

Goods receipt entry (empty, partially filled, with a cost-variance warning, ready to post), the
landed-cost allocation view, the posted read-only receipt, staff and manager variants, supplier
list and detail, and a mobile/tablet receiving layout for use at the loading bay.
