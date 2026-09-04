# 00 — Design foundation

**Do this first.** Everything else references what you define here.

## Your task

Establish the visual system for the OmniStock Inventory Portal: colour, type, spacing, density,
the component inventory, and the states every screen must support. Produce a reference sheet a
developer can build `@inventory-system/ui` primitives from, plus a specimen page showing every
component in every state.

## Start from what exists, don't reinvent it

The Vendor Portal already ships with this language, and the two portals sit in one product:

- Page surface `slate-950`, panels and cards `slate-900` with `slate-800` borders
- Primary action: indigo→violet gradient (`indigo-600` → `violet-600`), white text
- Body text `slate-100`, secondary `slate-400`, muted `slate-500`
- Radius `rounded-xl` on cards and buttons, `rounded-lg` on small controls
- Existing atoms: Button, Input, Select, Label, Badge, Skeleton, Spinner, Textarea
- Existing molecules: Card, Dialog, Sheet, Alert, AlertDialog, Toast, Pagination, EmptyState,
  FileDropzone, PageHeader

Keep this identity. Your job is to extend it for a data-dense, numbers-heavy product, not to
restyle it.

## What inventory adds that the vendor portal never needed

**Density.** A stock list shows hundreds of rows of numbers. Define a compact table row height and
a comfortable one, and say which screens use which. Numeric columns are right-aligned and use
tabular figures so digits line up down the column — this is non-negotiable for a product people
scan for anomalies.

**Money.** Define one money treatment used everywhere: thousands separators, exactly two decimals,
currency suffixed (`12.340,00 ден`), tabular figures, right-aligned. Negative amounts must be
unmistakable — a minus sign alone is not enough at a glance; use the critical status colour too.
Design the EUR indicative variant: same number, visibly secondary, always carrying its rate
(`≈ €200,44 · 61,50 ден/€`).

**Quantities.** Distinct from money — no currency, may carry a unit (`PCS`, `KG`, `L`).

**Status.** Reserve a status palette for good / warning / serious / critical. It is used for expiry
windows, stock levels and document states, and it is **never** reused as a chart series colour.
Every status is an icon **plus** a text label, never colour alone.

## Chart colour — and one constraint you must resolve

The repository has a validated data-visualisation palette in the `dataviz` skill
(`references/palette.md`). Use it as the source:

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | orange | `#eb6834` | `#d95926` |
| 3 | aqua | `#1baf7a` | `#199e70` |
| 4 | yellow | `#eda100` | `#c98500` |
| 5 | magenta | `#e87ba4` | `#d55181` |
| 6 | green | `#008300` | `#008300` |
| 7 | violet | `#4a3aa7` | `#9085e9` |
| 8 | red | `#e34948` | `#e66767` |

Sequential (magnitude) is a single blue ramp, `#cde2fb` lightest → `#0d366b` darkest.
Diverging (above/below a baseline) is blue ↔ red with a **neutral grey** midpoint.

**The constraint:** those dark steps were validated against surface `#1a1a19`. Our dark surface is
`slate-950` / `slate-900`, which is a blue-tinted near-black — a different background. Blue series
on a blue-black panel is exactly the pairing most at risk. **Re-validate the dark column against
our actual surface** by running `node scripts/validate_palette.js "<hex,…>" --mode dark` from the
skill directory, and re-step any hue that fails contrast or colour-blind separation. Report what
you changed and why. Do not judge this by eye.

Hard rules that follow from the skill and are not negotiable:

- Assign categorical hues in **fixed order, never cycled**. A ninth series folds into "Other" or
  becomes small multiples — never a generated hue.
- **Never a dual-axis chart.** Units and money on one plot is the most common dashboard mistake and
  it will be requested. Two charts, small multiples, or index both to a common base.
- Sequential is one hue light→dark. Diverging is two hues with a grey midpoint. Never a rainbow.
- Colour follows the entity, not its rank — filtering a series list must not repaint the survivors.
- Text stays in text colours. A number never wears its series colour; a coloured mark beside it
  carries the identity.

## Components to define

Beyond what exists, specify:

- **StatTile** — label, large value, delta vs previous period (with direction), optional sparkline.
  This is the dashboard's primary unit. Design its insufficient-data variant too.
- **HeroFigure** — the one number a screen leads with, ≥48px.
- **DataTable** — header, sortable columns, compact/comfortable density, row selection, sticky
  header, pinned first column, per-row actions, inline expansion for drill-down, pagination,
  and a loading skeleton that preserves column widths so the layout doesn't jump.
- **FilterBar** — one row above content: date range, location, category, search. State lives in the
  URL, so every filter must be linkable and restorable.
- **ChartCard** — title, optional subtitle, the chart, a legend, and a **table view toggle**. Every
  chart can be read as a table; managers frequently prefer the table.
- **Meter** — a single ratio against a limit (stock vs reorder point).
- **DocumentStatusBadge** — for the eight e-Faktura statuses; see prompt 05.
- **DetailDrawer** — a Radix Sheet used for row drill-down without losing list context.

## Universal states

Design each, once, as a pattern others reuse:

1. **Loading** — skeletons matching final layout. Never a centred spinner on a full page.
2. **Empty (nothing yet)** — explains the first action to take. This is the *normal* state in week
   one, so it must feel like a starting point, not a failure.
3. **Empty (filtered to nothing)** — visibly different from the above; offers to clear filters.
4. **Error** — what failed, whether it retries, and what the person can do.
5. **Permission-restricted** — for staff hitting a manager-only area. Explain, don't just 403.
6. **Insufficient data** — a metric that needs more history; shows progress toward the threshold.
   Detailed in prompt 06.

## Accessibility

Target WCAG 2.2 AA. Every interactive element reachable and operable by keyboard with a visible
focus ring that works on dark surfaces. Status never by colour alone. Charts always have a table
equivalent. Touch targets at least 44×44 for anything used on a phone — receiving and counting are
done standing up, one-handed.

## Deliverables

1. Token sheet: colour (both modes), type scale, spacing, radius, elevation, motion.
2. The validated chart palette, with your dark-surface findings and any re-stepping.
3. Component specimen page: every component, every state, both densities.
4. Number formatting rules: money, EUR indicative, quantity, percentage, date, datetime.
5. A one-page "how to extend this" note so later screens stay consistent.
