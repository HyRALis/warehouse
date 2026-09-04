# 06 — Analytics dashboard

**Depends on:** `00-foundation.md` (especially the validated chart palette)
**Background:** [architecture blueprint](../inventory-portal-architecture.md) §8

## Your task

Design the dashboard. This is the product's headline feature — the reason a manager buys it rather
than using a spreadsheet. It must help someone decide **what to buy next**.

## The hard constraint you must design around

**There is no historical data at launch.** Customers cannot import prior-year history. Every metric
starts empty on day one and fills forward. The flagship analytics — previous-year patterns,
seasonality, year-over-year — cannot produce a real answer for roughly **twelve months**.

A dashboard designed only for a mature dataset will look broken for the first year of every
customer's life. So this dashboard has to be excellent when nearly empty, and merely very good when
full. That is the central design problem here, and most of the work.

### Order by time-to-value

Lead with what works immediately, not with what is most impressive:

| Available | Metric |
|---|---|
| Immediately | Stock on hand, stock value, expiry risk |
| Day 1 | Sold today, sold this week |
| ~1 week | Best sellers, best margin items |
| 2–4 weeks | Reorder suggestions, velocity |
| 1 month | Period gross profit |
| **12+ months** | Seasonality, year-over-year |

### Insufficient-data states are a first-class design task

Every metric knows how much history it needs and how much it has. A metric that lacks history must
**never** render an empty chart or a flat zero line — that reads as "this product is broken".

Design a state that shows: what the metric will tell them, how much data has accrued, how much is
needed, and when it will become available ("collecting — 6 of 52 weeks"). It should read as
*accruing*, and ideally feel like progress rather than absence.

Do not fabricate, estimate or extrapolate data to fill the space. A fabricated trend on a screen
someone uses to commit real purchasing money is worse than no trend.

## Dashboard content

**KPI row — stat tiles, not charts.** Stock on hand, sold today, gross profit month-to-date
*(manager only)*, expiring within 30 days. Value, delta versus the previous period, sparkline. A
single number is a stat tile; never a one-bar bar chart.

**Then, in priority order:**

- **Sales trend** — line chart, day/week/month granularity. Works from day one.
- **Expiry risk** — buckets (expired, ≤7d, ≤30d, ≤90d) using the status palette, with value at
  risk for managers. Actionable: click through to the items.
- **Reorder suggestions** — a ranked table, not a chart. Item, current stock, daily velocity,
  supplier lead time, suggested quantity, and **why** it was suggested. The recommendation must be
  explainable in one line; a manager will not act on a number they cannot justify.
- **Best sellers** — horizontal bar, **single sequential hue**. This is a magnitude comparison, not
  an identity one. Do not give the top ten ten different colours.
- **Best margin items** — same treatment, manager only. Often a different list from best sellers,
  which is precisely the insight.
- **Category mix over time** — stacked bar, categorical palette, maximum eight series with the tail
  folded into "Other".
- **Seasonality** — heatmap (week or month × year), single sequential blue ramp. Insufficient-data
  state for the first year.
- **Year-over-year** — diverging bar, blue↔red with a grey midpoint. Insufficient-data state for
  the first year.

## Controls

A single FilterBar row above the content: date range (with presets — today, 7 days, 30 days,
quarter, year), location, category. All state lives in the URL so a dashboard view is shareable.

**EUR display toggle** — switches monetary displays to an indicative euro conversion. Every
converted figure must carry its rate and read as indicative (`≈ €12.340 · 61,50 ден/€`). It is a
display lens only: it never appears in exports and never changes stored values. Design it so it
cannot be mistaken for a currency the business actually trades in.

## Chart rules you must follow

From the foundation prompt, restated because this is where they bite:

- **Never a dual-axis chart.** "Units sold and revenue together" will be requested; the answer is
  two charts or indexing both to a common base.
- Every chart has a **table view toggle**. Managers frequently prefer the table, and it is also the
  accessibility path.
- Legend for two or more series; direct labels at four or more. Never a number on every point.
- Hover crosshair and tooltip on every time series.
- Colour follows the entity, never its rank.
- Status colours are reserved and never reused as series colours.

## Live behaviour

Stock and same-day sales tiles refresh every 10–15 seconds. Design the refresh so it is calm — a
subtle freshness indicator, never a spinner that makes the number disappear or a layout that jumps.
Also design the stale/disconnected state.

## Permissions

Staff and viewers see no cost, margin, profit or stock-value figures. Design a genuinely useful
staff dashboard — stock, expiry, what sold, what to reorder — rather than the manager dashboard
with holes in it.

## Deliverables

Desktop dashboard in three lifecycles: **day one** (nearly empty), **month three** (partial —
some metrics live, some still collecting), and **year two** (full). Manager and staff variants.
Every chart in its normal, insufficient-data, loading, empty and error state. Tablet and mobile
layouts. The EUR toggle. The reorder suggestions table with explanations.
