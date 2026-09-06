# 07 — Financials, settings and alerts

**Depends on:** `00-foundation.md`

## Part 1 — Financials *(explicit financial permissions)*

### What this is, and the naming that matters

Revenue minus cost of goods sold, by month, quarter and year. It deliberately **excludes** payroll,
rent, and all operating expenses.

So call it **Gross Profit**, never "Profit". A manager who reads "Q3 profit: 400.000 ден" and does
not realise wages and rent are excluded will make a bad decision with your number. The label is
doing real work — reinforce it with a short, permanently visible explanation of what is and is not
included, not a tooltip someone has to find.

### Screens

**Period summary.** Pick month, quarter or year. Show revenue (net), cost of goods sold, gross
profit, and gross margin percentage. Lead with a hero figure for the selected period. Compare
against the previous period; compare against the same period last year only once that data exists
(otherwise the insufficient-data state from prompt 06).

**Breakdowns.** Gross profit by category, by location, and by item — as ranked tables with
optional charts. Managers want to know *where* the money came from, and a table is usually the
better answer here.

**Movements affecting profit.** Purchases, write-offs and returns in the period, since these are
what a manager questions when a figure looks wrong. Make the number traceable: every figure should
be clickable down to the documents behind it. A financial number nobody can drill into is a number
nobody trusts.

**Export.** CSV, **MKD only, with no EUR column**. Exports usually end up with an accountant, and
an indicative conversion has no place in a statement of record. Design the export dialog to make
the period and scope explicit.

## Part 2 — Settings

Show each area only with its relevant configuration permission. Operational management does not
automatically grant team administration, financial export or invoice-signing authority. Group into:

**Locations** — code, name, type, timezone and FIFO/FEFO/manual stock rotation. Suggest FEFO for
expiry-led warehouses and explain assumed versus confirmed batch picks. New sales cannot exceed
available sellable stock; there is no routine negative-stock override in this release. Fiscal
recovery discrepancies are separate facts to investigate.

**Suppliers** — covered in prompt 03; link to it here.

**VAT rates** — effective-dated. Macedonia has a standard 18% rate plus reduced rates. Show which
rate is currently active and when each takes effect. Historical rates are never edited, only
superseded — design that constraint honestly.

**Pricing** — effective-dated item/location prices and batch overrides. Every change prompts for
this batch or all batches of the item and previews location/quantity impact. An all-batch change
supersedes conflicting overrides in the chosen scope; retain the history.

**Team and permissions** — Person -> job preset(s) -> locations -> review effective access -> save.
Use the proposed receiver, warehouse worker, controller, store manager, finance and viewer presets;
cashier is later POS. Exact preset grants remain open. Allow combined jobs with a bounded advanced
permissions list, not a role hierarchy or policy editor. Show a plain-language access summary.

Separate prepare/post, count/adjust, damage-report/hold/write-off, return/refund, receipt-cost entry/
posted-cost correction, price changes, invoice prepare/sign/accept, financial read/export and team
administration. Show costs on receiving only when granted; do not expose general valuation/margins
by implication. Team management is owner-controlled or explicitly delegated within limits: prevent
self-escalation, granting beyond delegated actions/locations and hidden organization-wide access.
Audit access changes; include revoked access before submission and updates to the worker's worklist.

**Approvals** — one scoped worklist, with original document, requested change, reason and impact.
Only request approval for an action the requester cannot already perform. Tie approval to the exact
revision; changes invalidate it. Do not force a second employee in an owner-operated store. Signing,
stock/cost/price validation and correction dependencies still apply after approval.

**Financial permissions** — sales totals, supplier costs, valuation/margin and export have separate
grants and location scopes. Financial exports require both relevant data access and export authority.

**e-Faktura** — registered certificates (holder, serial, expiry, e-UJP id, tax number), with
expiry warnings well in advance. Emphasise that the platform never stores private keys and signing
happens on the user's own machine; this is a trust-building fact, not an implementation detail to
hide.

**Display currency** — MKD or the indicative EUR lens, with the rate and its source and date.

## Part 3 — Alerts

Design an alerting surface that respects attention. This product could easily generate hundreds of
notifications a day and become noise nobody reads.

Alert types: low stock (below reorder point), expiring soon (configurable windows), expired stock
present, stock discrepancy, uncertain fiscal outcomes awaiting recovery, e-Faktura awaiting
signature, incoming faktura approaching auto-accept deadline, and certificate expiring.

Design:

- **A worklist, not a feed.** These are things needing a human decision, not news. Once handled,
  they leave. The count should be actionable and should reach zero.
- **Grouping.** "23 items below reorder point" as one entry, not 23 alerts.
- **Configuration.** Thresholds, expiry windows and routing to workers with the required action/scope.
  Receipt/sale success uses follow-up links; missing prices and invoice tasks enter this worklist.
- **An empty state that feels good.** Nothing needing attention is a success, and should look like
  one rather than like a broken page.

## Deliverables

Period summary for month, quarter and year, including the first-period case with no comparison
available; breakdown tables; the drill-down path; the export dialog; every settings screen; role
assignment with its consequence made clear; certificate management with an expiry warning; the
alerts worklist populated and empty; and alert configuration.
