# 02 — Stock, lots and expiry

**Depends on:** `00-foundation.md`

Apply its appended modification instructions and the worker-permission model in `README.md`.
Keep stock list -> item -> relevant action as the normal journey; expand lots/history on demand.

## Your task

Design the screens where people find out what they have, how old it is, and when it expires. This
is the most-used part of the product and the densest.

## Screens

### Stock list

The default working view. Columns: item name, SKU/barcode, category, quantity on hand, unit,
reorder point, a stock-level meter, earliest expiry, and — **valuation permission only** — average cost and
stock value.

Requirements:

- Server-side sort, filter and pagination; hundreds to tens of thousands of rows.
- Filters in the FilterBar: category, low-stock-only, expiring-within-N-days, has-stock-only,
  supplier, text search. All filters live in the URL and are shareable.
- Fast visual scanning for the two things people actually look for: **below reorder point** and
  **expiring soon**. Status colour plus icon plus label.
- Bulk selection with actions: adjust, count, transfer, export.
- The stock-only variant has no cost or value columns — design the table so removing them doesn't
  leave an awkward gap.

### Item detail

Header with identity (name, SKU, barcode, category, unit, supplier), current stock across
locations, and a stock-level meter against the reorder point.

Then, in tabs or sections:

- **Lots** — the batch table. This is the "expiry per bulk delivery" requirement, and it is the
  screen a fresh-goods manager lives in. Per lot: lot code, quantity remaining, expiry date, days
  remaining, received date, supplier, goods receipt reference, and *(lot-cost permission only)* unit cost.
  Sort by expiry ascending by default, because the next thing to spoil is the thing that matters.
- **Movements** — the ledger for this item: date, type (receipt, sale, adjustment, write-off,
  transfer, count correction), quantity delta with sign, resulting balance, actor, and source
  document link. Long and append-only; virtualise it.
- **Price history** — effective-dated selling prices, showing when each took effect.
- **Change price** — a worker with price-management permission chooses this batch or all batches of this item, previews affected
  locations/stock and confirms. Display active batch overrides and superseded prices clearly.
- **Sales trend** — a small chart, with an insufficient-data state (see prompt 06).

### Expiry board

A dedicated view answering "what do I need to deal with this week". Bucket lots into **expired /
≤7 days / ≤30 days / ≤90 days**, using the status palette. Show quantity and, with valuation permission,
value at risk per bucket. Offer authorized damage-report/hold, write-off and pricing actions here.

### Counts and adjustments

- **Stock count**: use the selected location/scope, enter quantities, then review variance. Count
  entry and posting the resulting adjustment are separate permissions. An authorized controller
  can post; otherwise submit a saved request to their worklist, tied to this exact revision.
- **Adjustment**: single item, signed quantity, mandatory reason, optional note.
- **Transfer**: item and quantity from one location to another, moving lot identity with the goods.
- **Stock rotation setting**: FIFO, FEFO or manual at the location level. Recommend FEFO for
  expiry-led warehouses; identify retail allocations as assumed unless the actual batch is recorded.
  Show warehouse pick recommendations and actual-pick overrides. Rotation never permits expired or
  held stock, and never silently chooses a price where batches have different prices.
- **Damaged/dysfunctional/spoiled stock**: hold out of sale, then write off or return to supplier,
  recording reason, quantity, value effect and original lot. Held goods are not sellable quantity.
- **Cost correction**: separately authorized flow showing original cost, corrected total, reason and effect on
  remaining stock versus already-sold goods; no quantity movement for a value-only correction.

All three post to an append-only ledger. Nothing is ever edited or deleted — corrections are new
entries. Reflect that honestly: no "edit" affordance on a posted movement, and a clear
"this creates a correcting entry" message where a user might expect an edit.

## Permissions and simplicity

Use the proposed warehouse-worker, controller, manager and viewer presets as examples, not fixed
grants. Receipt-cost access does not expose lot costs here. Separate count entry/adjustment posting,
damage reporting/hold/write-off, future-price management and historical-cost correction. Transfers
need source and destination authority. Exports require the relevant data and export grants.
Open corrections from the original record and use one change/reason/impact review. Keep internal
ledger checks in annotations. Permission and domain checks are enforced again when posting; changing
a request invalidates its earlier approval. Approval does not bypass movement conflicts or validation.

## Mobile

Counting and checking expiry happen on a phone in an aisle. Design the count entry and the expiry
board for one-handed use, large tap targets, and a number pad. The full stock table can degrade to
cards on mobile, but the count flow must be genuinely good there, not merely responsive.

## Deliverables

Stock list (stock-only and explicitly cost-authorized, plus loading / empty / filtered-empty / error); item detail with all
sections; the expiry board with populated and clean states; count, adjustment and transfer flows
including count-entry versus adjustment-approval states, denied/revoked access and one impact
confirmation; and mobile layouts for counting and expiry.
