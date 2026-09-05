# Inventory Portal — design prompts for Claude Design

Nine documents. `00-foundation.md` establishes the design system and **must be done first**;
everything after it depends on the tokens, components and states it defines. The seven feature
prompts can then be run in any order, though the listed order matches the build roadmap in
[the architecture blueprint](../inventory-portal-architecture.md) §15.

| # | Prompt | Designs |
|---|---|---|
| 00 | [Foundation](00-foundation.md) | Tokens, dark-first palette, chart colours, component inventory, universal states |
| 01 | [App shell](01-app-shell.md) | Navigation, location switcher, role-aware chrome |
| 02 | [Stock, lots and expiry](02-stock-and-lots.md) | Stock list, item detail, batch expiry, counts, adjustments |
| 03 | [Receiving](03-receiving.md) | Suppliers, goods receipt, per-delivery cost, landed cost |
| 04 | [Sales and recovery](04-sales-and-reconciliation.md) | Sale entry, returns, corrections, later own-POS recovery |
| 05 | [e-Faktura](05-efaktura.md) | Issuing, signing hand-off, two-step incoming accept/reject |
| 06 | [Analytics dashboard](06-analytics.md) | The flagship dashboard, insufficient-history states |
| 07 | [Financials, settings, alerts](07-financials-settings-alerts.md) | Period gross profit, configuration, alerting |

## Read this before starting any prompt

**Already-used prompts 00 and 01:** preserve their original instructions and existing designs.
Apply the dated **Required modifications** addenda at the end of each as incremental changes.
Those addenda override conflicting earlier instructions. Prompts 02–07 incorporate the revision directly.

**The product.** OmniStock Inventory Portal — stock management for store and warehouse managers in
North Macedonia. It is the second portal on an existing platform; a Vendor Portal already ships and
its visual language is the starting point, not a blank page.

**Worker journeys and permissions (IPD-031).** Read the shared
[simplification and permissions proposal](../inventory-ux-and-permissions.md). The old closed
manager/staff/viewer model is superseded. Different jobs need different action and data access,
scoped to assigned locations. These are proposed presets, not finalized grants:

| Preset | Typical work |
|---|---|
| Receiver | Receipt costs, complete deliveries, reuse approved selling prices |
| Warehouse worker | Stock, picks, count entry, damage reporting; no supplier costs |
| Stock controller | Review counts and authorized stock adjustments |
| Store manager | Location operations, pricing, corrections and permitted reports |
| Finance worker | Invoice preparation, permitted financial views and exports |
| Cashier — later POS | Approved-price sales and initiating returns |
| Viewer | Read-only stock and expiry |

Owner administration and delegated access management are distinct from operational management.
People may combine responsibilities. Action permissions, not job titles, govern controls and data.
Separate prepare/post, count/adjust, report damage/write off, initiate return/refund, receipt cost/
historical cost correction, invoice prepare/sign/accept, financial view/export and team administration.
Do not make a receiver's routine posting wait for approval they already have authority to perform.

The server checks membership, subscription, portal access, action and location scope for every
protected operation, including exports. Restricted fields are absent from responses, not blurred.
Receipt-cost access does not expose stock valuation or margins. An approved request never bypasses
required cost, available stock, confirmed price, correction dependencies or certificate requirements.

**Simplify the surface.** Show short worker journeys first; put internal checks in design annotations.
Receive: scan -> quantity/cost -> Receive stock, with approved-price reuse confirmed inline. Opening:
store details -> stock grid/import -> review/start. Corrections begin from the original document.
Use one worklist for exceptions and approvals; do not interrupt each receipt/sale with invoice dialogs.
Use inline validation, relevant tracking fields and expandable optional details. Preserve explicit
cutover, price-scope, correction and invoice-acceptance confirmations.

**The stack you are designing for.** Next.js App Router, Tailwind CSS 3, Radix primitives, an
existing shared `@inventory-system/ui` package organised as atoms → molecules → organisms. Charts
will be built on Recharts, wrapped inside that package. Tables will be built on TanStack Table
(headless), so table styling is entirely ours.

**Money.** All amounts are Macedonian denar (MKD), stored as integer minor units. A dashboard-only
toggle can display EUR as an *indicative* conversion — it must always be labelled with its rate
and never appears in financial exports. Never design a money input that accepts EUR.

**Language.** Design in English, but **every layout must tolerate Macedonian Cyrillic**, which runs
roughly 20–30% longer than the English equivalent. Never rely on a label fitting in a fixed narrow
column. Official tax and document terms stay in Macedonian regardless of interface language —
`ЕДБ` (tax number), `Фактура`, `Книжно одобрение`, `Книжно задолжение` — because they are legal
terms with specific meanings.

**Dark first.** The existing portal is dark-surfaced (`slate-950` page, `slate-900` panels, indigo
→ violet accent gradient). Dark is the primary mode here, not an afterthought. See `00-foundation`
for the exact constraint this places on chart colour.

## What good output looks like

For every screen: the default state, plus **loading, empty, error, and permission-restricted**.
Also show missing-price follow-up, request-awaiting-approval where applicable, and permission revoked
before submission. Each workflow names its actor, action permission, location scope and recovery.
Several screens additionally need an *insufficient data* state — see `06-analytics`. A design that
only shows the happy path with full data is not usable, because this product spends its first weeks
mostly empty.

Deliver responsive layouts at desktop (1440), tablet (768) and mobile (390). Warehouse and shop
floor staff use phones and tablets on their feet; managers use desktops. Receiving and counting in
particular are one-handed, standing-up tasks.
