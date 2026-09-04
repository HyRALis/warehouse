# 07 — Financials, settings and alerts

**Depends on:** `00-foundation.md`

## Part 1 — Financials *(manager only)*

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

Manager-only. Group into:

**Locations** — list and edit; code, name, type (warehouse or store), timezone, whether negative
stock is allowed. Explain that last one in plain language: allowing negative stock means a sale is
never blocked by a stock error, and the discrepancy is raised for review instead.

**Suppliers** — covered in prompt 03; link to it here.

**VAT rates** — effective-dated. Macedonia has a standard 18% rate plus reduced rates. Show which
rate is currently active and when each takes effect. Historical rates are never edited, only
superseded — design that constraint honestly.

**Pricing** — how selling prices are set, per item and optionally per location, effective-dated. A
price change creates a new entry rather than overwriting; show the history.

**Team and roles** — assign `INVENTORY_MANAGER`, `INVENTORY_STAFF` or `INVENTORY_VIEWER` per person
per location. Make the consequence visible: state explicitly that staff cannot see cost, margin or
financials, so the person granting access understands what they are granting.

**e-Faktura** — registered certificates (holder, serial, expiry, e-UJP id, tax number), with
expiry warnings well in advance. Emphasise that the platform never stores private keys and signing
happens on the user's own machine; this is a trust-building fact, not an implementation detail to
hide.

**Display currency** — MKD or the indicative EUR lens, with the rate and its source and date.

## Part 3 — Alerts

Design an alerting surface that respects attention. This product could easily generate hundreds of
notifications a day and become noise nobody reads.

Alert types: low stock (below reorder point), expiring soon (configurable windows), expired stock
present, negative stock discrepancy, unmatched POS lines accumulating, e-Faktura awaiting
signature, incoming faktura approaching auto-accept deadline, and certificate expiring.

Design:

- **A worklist, not a feed.** These are things needing a human decision, not news. Once handled,
  they leave. The count should be actionable and should reach zero.
- **Grouping.** "23 items below reorder point" as one entry, not 23 alerts.
- **Configuration.** Thresholds, expiry windows, and which alerts each role receives.
- **An empty state that feels good.** Nothing needing attention is a success, and should look like
  one rather than like a broken page.

## Deliverables

Period summary for month, quarter and year, including the first-period case with no comparison
available; breakdown tables; the drill-down path; the export dialog; every settings screen; role
assignment with its consequence made clear; certificate management with an expiry warning; the
alerts worklist populated and empty; and alert configuration.
