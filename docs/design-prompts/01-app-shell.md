# 01 — App shell and navigation

**Depends on:** `00-foundation.md`

## Your task

Design the frame every inventory screen sits inside: navigation, the location switcher, role-aware
chrome, and the entry experience for a brand-new organization.

## Context

This is a second portal on a platform the user may already use for the Vendor Portal. An
organization subscribes to portals; a person may have access to one or both. The shell must make it
obvious which portal you are in and let you move between them without feeling like you logged into
a different product.

## Navigation

Group the destinations. Suggested grouping, adjust if you find better:

- **Overview** — the analytics dashboard (the landing screen)
- **Stock** — stock list, item detail, lots and expiry, counts, adjustments, transfers
- **Receiving** — goods receipts, suppliers
- **Sales** — manual sales entry, reconciliation queue
- **Documents** — e-Faktura outgoing, incoming, awaiting signature
- **Financials** — period gross profit *(manager only)*
- **Settings** — locations, VAT rates, roles, e-Faktura credentials *(manager only)*

Reuse the Vendor Portal's grouped sidebar pattern: group heading, items, collapsible to an
icon rail, and a Sheet on mobile. Manager-only groups are **absent** for staff, not disabled.

## The location switcher — the piece that needs the most thought

Stock is per-location. Almost every number on screen is scoped to a location, and showing a
warehouse manager the wrong location's stock is a genuinely costly mistake.

Design a switcher that is:

- **Always visible.** Never buried in settings. The current location is part of the page's identity.
- **Unmissable when it changes.** Switching context should be as obvious as switching accounts in a
  banking app.
- **Honest about "All locations".** Some views can aggregate (analytics, financials); others cannot
  (receiving, counting — you receive into *a* place). Design how a view that cannot aggregate
  behaves when "All" is selected: it should prompt for a specific location rather than silently
  picking one.

Show the single-location case too. Most customers have one location, and they must not pay a
usability tax for a feature they don't use — the switcher should recede almost to nothing.

## Header

- Search across items, documents and suppliers
- Location switcher
- Pending-work indicator: documents awaiting signature, unmatched POS lines, expiring stock. This
  is a *worklist* cue, not a marketing notification bell — it should say how many things need a
  human, and go quiet when there is nothing.
- Account menu with portal switcher and the current role clearly stated

## First-run

A brand-new organization has no locations, no items, no stock, and no history. Design that first
session: what the dashboard says when there is genuinely nothing, and a guided path — create a
location, add or import items, record a first delivery. This is the state every customer starts in,
so it deserves real design attention rather than a generic empty page.

## Deliverables

Sidebar expanded / collapsed / mobile; header with all indicator states; the location switcher in
single-location, multi-location and "All locations" cases, plus the cannot-aggregate prompt; the
role variants (manager vs staff vs viewer); and the first-run experience.
