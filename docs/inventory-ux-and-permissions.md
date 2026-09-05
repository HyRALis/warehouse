# Inventory simplification and worker permissions

2026-09-05. Working proposal following the founder's request to simplify the portal without losing
security or validation, and to give different worker types different access. The requirement is
accepted; the worker presets and exact grants below await confirmation of target-store jobs.

This revises the proposed closed manager/staff/viewer model in architecture section 4.3 and IPD-012.
IPD-030's receiving-cost access remains available to authorized receivers; it must not be inherited
by every worker merely because they are called staff. The existing FigJam is the detailed system
map; it is not a prescription for how many screens a worker must visit.

## Simplify the everyday interaction

Use task-oriented navigation: **Home, Stock, Receive, Sales & returns, Documents, Reports**. Settings
is secondary navigation. Show only the tasks the person can use. A receiver's Home prioritizes
deliveries and drafts; a manager's Home prioritizes exceptions requiring their authority.

| Task | Proposed ordinary interaction | Checks retained behind it |
| --- | --- | --- |
| Opening setup | Store details -> one stock grid/import -> review and start | Costs, quantities, tracked lot/expiry fields, import errors, cutover and duplicate-post prevention |
| Receive | Scan items -> quantity + unit/bulk cost -> Receive stock | Authorization, required cost, exact allocation, tracking fields, stock posting and approved price |
| Price already approved | Show reuse price inline and include confirmation in Receive stock | Staff cannot invent a price; recheck the approved price at posting |
| Price missing | Receive on hand; show Needs selling price task for authorized worker | Goods remain unavailable for sale |
| Change price | Enter price -> this batch/all batches -> one impact preview and confirm | Location scope, override rules, history and permission |
| Return or correct | Open original document -> choose action -> enter change/reason -> confirm | Returnable quantities, condition, dependency checks, linked history |
| Invoice follow-up | Documents worklist after physical receiving/sale | Signature, explicit invoice acceptance and submission recovery remain separate |

Use the selected working location as a visible default, without making it the security boundary.
Only request lot/expiry fields for items configured to track them. Batch selection is exceptional
when automatic allocation is sufficient; distinct batch prices still require actual identification.
Show supplier reference, freight allocation and additional metadata under expandable details, while
surfacing any field required for the particular document. Do not silently reuse purchase costs.

Validate fields inline and show one actionable summary at final submission. Avoid repeated generic
confirmation dialogs. Keep explicit confirmation for opening cutover, batch/all-batch price scope,
posted corrections and invoice acceptance. No authorized worker may bypass domain invariants.

## Roles are editable job presets, permissions are specific actions

Recommended first design: owner selects a job preset and locations; optional advanced permissions
show a bounded list of clear actions. Avoid a policy-language editor, nested role hierarchy, or a
separate permission for every button. Confirm the preset list before implementation.

| Proposed preset | Normal work | Excluded by default |
| --- | --- | --- |
| Receiver | Receive, enter receipt costs, post complete deliveries, reuse approved sale prices | New prices, posted-cost corrections, broad financial reports |
| Warehouse worker | View stock, record picks/counts, flag damaged goods, prepare movement drafts | Supplier costs, prices, refunds, posting stock adjustments/write-offs |
| Stock controller | Review counts and post authorized stock adjustments, manage physical stock | Price changes, supplier-cost corrections, financial reports, team administration |
| Store manager | Operational approvals, pricing, corrections and location reports | Other locations, ownership/billing, granting access unless explicitly delegated |
| Finance worker | Invoice preparation, cost/financial views and permitted exports | Physical stock adjustments, changing prices, team administration; signing/acceptance are separate grants |
| Cashier — later POS | Sell at approved prices and initiate customer returns | Purchase costs, margin, inventory adjustments, refund approval unless granted |
| Viewer | Read stock/expiry in assigned locations | Mutations and financial information |

Owner retains organization administration. Ownership does not bypass stock/price validation or
replace the certificate/signing requirements of a fiscal document. Small-store owners can cover
several jobs; do not force separate employees or compulsory approval chains for routine receiving.

Separate permissions where the distinction matters: receipt draft vs post; count entry vs adjustment
posting; flag damage/hold vs write-off; return initiation vs refund authorization; receipt cost entry
vs historical cost correction; invoice prepare vs sign/submit vs accept/reject; financial read vs
export; team access management vs operational management. Initial grants must be deny-by-default.

Keep financial visibility explicit: supplier costs, valuation/margin, sales totals, and financial
exports are not one universal 'can view reports' flag. Cost access on receiving documents does not
grant cost access through stock search, movement lists or sales responses.

## Enforcement and approvals

Effective access requires an authenticated active member, an active organization portal
subscription, portal access, the relevant action permission, and all locations affected by that
action. Transfers require the appropriate source and destination authority; organization-wide
invoices/reports need explicit scope, not an accidental null-location grant.

Enforce on the server for reads, writes, exports and background work. Scope returned rows and fields;
hiding controls only improves the interface. Recheck permissions and document state when posting.
Permission revocation takes effect on subsequent protected operations, including queued work before
execution. Capture the requesting actor and approving actor separately.

For an action requiring approval, save the request against the exact document revision and show it
in the authorized person's worklist. Any material change invalidates that approval. Resolve ordinary
receipts immediately when the receiver already has posting authority. Approval never makes an
invalid sale, impossible reversal or missing-cost receipt valid.

Team management must prevent self-escalation or granting beyond delegated permissions/locations.
Audit grants, revocations, posting, corrections and approvals. Keep existing authentication and
two-factor security; do not introduce repetitive reauthentication for low-impact navigation.

## Decisions still needed

- Actual first-store worker types and which tasks one person commonly combines.
- Who can post stock adjustments/write-offs, authorize refunds, and see sales totals or margins.
- Whether store managers may assign access, and only within which delegated locations/actions.
- Who prepares versus signs/submits or accepts invoices.
- Whether any actions require approval by a different person; do not assume a two-person store.

The [Revision 2 FigJam section](https://www.figma.com/board/oQWHAnuhcW4GxNg2xktX92?node-id=7-682)
now shows short worker journeys, a proposed access matrix and a separate validation/approval flow.
Older inventory sections are labeled REFERENCE V1. Prompts 00/01 have appended modification notes
for already-created designs; 02–07 and the design README are updated directly.
