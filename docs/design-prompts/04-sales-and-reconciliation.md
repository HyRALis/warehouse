# 04 — Sales entry and POS reconciliation

**Depends on:** `00-foundation.md`

## Your task

Design two things: recording a sale by hand, and resolving sales that arrived automatically from an
external POS but could not be matched to an item.

## Manual sale entry

For a warehouse issuing an invoice, or a shop with no till system.

Header: location, document type, issue date, customer (optional for a walk-in; required with ЕДБ
for a company).

Lines: item search, quantity, unit price (prefilled from the effective price list, overridable),
discount, VAT rate. Live totals: net, VAT, gross.

Design notes:

- Item search is the whole experience — by name, SKU or barcode, with stock-on-hand shown in the
  results so the user knows what they can sell.
- Show remaining stock as lines are added, and warn before selling more than is on hand. Warn,
  do not block: the goods may physically have gone out already, and refusing to record a real sale
  would put a hole in the data.
- Price overrides should be visible, not silent — a changed price is a margin decision.
- **After posting, a dialog asks whether this transaction needs a faktura.** Designed in prompt 05.
  Here, design the seam: the sale posts first and stands on its own.

## Reconciliation queue

External POS systems push sales continuously. Their product codes drift from ours, so some lines
arrive unmatched. Those sales still post — losing revenue data would corrupt the analytics — and
the unmatched lines land here.

Design a queue that makes resolution fast and repetitive:

- Group by external code, not by document. The same unknown barcode appears across dozens of sales,
  and mapping it once should resolve all of them at once. Show how many sales and what value each
  unresolved code represents, so the biggest problem is obviously first.
- Per code: the raw external code, whatever description the POS sent, occurrence count, date range,
  and value.
- Resolution: search and pick the matching inventory item, or create a new item from the POS data.
  Mapping is remembered — the same code never needs resolving twice.
- Show the consequence plainly: "mapping this will apply to 47 sales since 12 August".

Also surface **stock discrepancies** here — sales that drove stock negative. These indicate the
recorded stock is wrong, not that the sale was wrong, and the fix is usually a count. Make the
distinction clear so nobody "corrects" a real sale.

## Permissions

Staff can record sales. Margin and cost stay manager-only, so the staff sale screen shows price and
totals but never cost or profit.

## Deliverables

Manual sale entry (empty, with lines, with an insufficient-stock warning, posted); the
reconciliation queue grouped by code with empty, busy and resolving states; the map-to-item and
create-item flows; the discrepancy view; and mobile layouts.
