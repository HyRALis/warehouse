# 04 — Sales entry and sale recovery

**Depends on:** `00-foundation.md`

## Your task

Design manual sales/invoice entry and operational sale-recovery views. OmniStock will build its
own POS after inventory. External POS adapters and external-code mapping screens are out of scope.

## Manual sale entry

For a warehouse issuing an invoice, or a shop with no till system.

Header: location, document type, issue date, customer (optional for a walk-in; required with ЕДБ
for a company).

Lines: item search, quantity, unit price (prefilled from the effective approved price list),
discount, VAT rate. Live totals: net, VAT, gross.

Design notes:

- Item search is the whole experience — by name, SKU or barcode, with stock-on-hand shown in the
  results so the user knows what they can sell.
- Show available sellable stock, excluding unreleased or held batches. **Block a new sale** with
  insufficient quantity or no confirmed selling price. Buying three when two remain must be blocked,
  including concurrent-till conflicts. Preserve completed fiscal outcomes discovered during recovery through the
  separate reconciliation flow; this is not an override button for new sales.
- Price changes and discounts require their relevant permissions and visible scope; ordinary sale
  permission is not a price-override permission. No override bypasses required price/stock validation.
- **Invoice choice is inline or a post-sale follow-up link**, with outstanding work in Documents.
  Do not open a mandatory invoice dialog after every sale. Posting stands independently of invoicing.

## Sale recovery

Our POS uses canonical inventory item IDs and the shared sale lifecycle. Design a worklist for
uncertain fiscal outcomes, interrupted commits and stock/valuation discrepancies. Show sale/till/
device identity, approved amount, reserved stock, last known device result and permitted next action.
An unknown result must not look like a failed sale with a generic **Try again** button that creates
another receipt. Keep the stock reservation until recovery establishes the outcome.

Surface shortages as discrepancies requiring investigation; never erase a completed fiscal fact
or silently assign zero cost. Include audit attribution and links to receipt/correction evidence.
Do not design external product-code mapping. Detailed checkout/payment/device screens come in the
later POS phase, while inventory exposes the necessary sale and recovery state now.

## Batch selection and price changes

When batches have different selling prices, require a batch-specific code or explicit batch
selection; show which batch/price will be charged. Split lines when selected quantities span
different prices. A warehouse's FIFO/FEFO recommendation can suggest a pick but must not guess a
retail customer's price. Workers authorized to change prices choose this batch or all batches of the item,
with affected locations and quantities visible before confirmation.

## Corrections and returns

Provide linked sales corrections, price-only credits, partial customer returns, and cancellation
with explicit physical effect. Record the original line/quantity and show earlier returns. A
price-only change has no stock effect; a damaged return goes to held stock or write-off rather
than immediately becoming sellable. Changing the future item selling price is a separate action
from correcting an already-completed sale. Required invoice correction follows the e-Faktura flow.

Start from the original sale -> choose Return/Correct -> enter quantity, condition, change and reason
-> one impact confirmation. Expand advanced details when relevant. Separate initiating a return,
accepting/restocking physical goods, authorizing a refund and correcting an invoice. A request that
needs another permission enters that worker's worklist; changing it invalidates prior approval.

## Permissions

Use action/location permissions, not the old broad staff role. A sale-authorized worker sees prices
and transaction totals, without receiving purchase-cost or margin access. Aggregate sales reports
are separately controlled. Refund approval, selling-price changes, posted corrections and fiscal
recovery are explicit grants. The proposed cashier preset belongs to later POS work. All new sales
still require sufficient sellable stock and confirmed price, regardless of job title or approval.

## Deliverables

Manual sale entry (empty, with lines, blocked for insufficient stock/missing price, posted); the
sale-recovery worklist with empty, busy, uncertain and resolved states; batch/price selection;
the discrepancy view; and mobile layouts. The future POS is a separate design deliverable.
