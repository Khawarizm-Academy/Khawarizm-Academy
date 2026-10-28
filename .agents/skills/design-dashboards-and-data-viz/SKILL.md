---
name: design-dashboards-and-data-viz
description: Dashboard, admin panel, and data visualization design - dashboard layout and navigation, KPI cards, choosing the right chart, chart design rules (axes, labels, color, annotations), tables and filters, empty/loading states, density, real-time data, responsive dashboards, accessibility of charts, performance with large data, and self-contained workspace patterns. Use when building learner/user dashboards, admin back-offices, analytics screens, reports, or any chart.
---

# Dashboards & Data Visualization

A dashboard answers **"how am I doing and what should I do next?"** at a glance. Show the few numbers that drive decisions, then let people drill down.

## 1. Layout and navigation

- Shell: sidebar (desktop) or top tabs/bottom bar (mobile), slim top bar with search/notifications/account. Sidebar items = destinations; section-level filters = tabs/pills inside pages ([`design-ui-components`](../design-ui-components/SKILL.md)).
- Page structure: **header (title + primary action + date range) -> KPI row -> main chart/table -> secondary widgets**. Primary column wide, widget column narrow and sticky ([`fe-responsive-layout-and-fixes`](../fe-responsive-layout-and-fixes/SKILL.md) §3).
- Canvas stays consistent with the product: cards are raised surfaces over the page canvas; never paint a different solid page background that makes the dashboard feel like another app ([`design-fundamentals`](../design-fundamentals/SKILL.md) §5).
- Self-contained workspace: actions (resume lesson, join session, apply, review) resolve in in-page overlays/drawers, not by bouncing to other routes ([`fe-component-architecture`](../fe-component-architecture/SKILL.md) §8).

## 2. KPI cards

Value (large), label, comparison/delta vs previous period with direction + color + icon (not color alone), optional sparkline, link to detail. 3-5 KPIs, not 15. Define each metric precisely (formula, period, timezone) and show the "as of" time.

## 3. Choosing the chart

| Question | Chart |
| --- | --- |
| trend over time | **line** (or area for cumulative) |
| compare categories | **horizontal/vertical bar** (sorted) |
| part of whole (<= 5 parts) | stacked bar, or donut with direct labels |
| distribution | histogram, box plot |
| relationship | scatter (with trend line) |
| ranking | sorted bar / table with in-cell bars |
| progress to goal | progress bar / radial ring |
| exact values | **table** |
| geography | choropleth/proportional map |

Avoid 3D, pies with many slices, dual axes that mislead, truncated bar baselines (bars start at zero), and decoration that adds no data.

## 4. Chart design rules

- Title states the **insight or the metric + period**; subtitle for units/filters.
- Label axes with units; direct-label lines/bars instead of relying on a legend; light gridlines; no chartjunk.
- Color: one hue for one series, accent for the focus, grey for context; <= 6-8 categorical colors, color-blind-safe, consistent per entity across charts ([`design-color-and-contrast`](../design-color-and-contrast/SKILL.md) §8).
- Tooltips on hover/focus with exact values; keyboard-accessible.
- Annotate events (launch, outage) when they explain a change.
- Responsive: simplify on mobile (fewer ticks, horizontal scroll or a table fallback), keep text >= 12px.
- Consistent number formats: thousands separators, compact notation (1.2K, 3.4M), percent decimals, currency, local digits and RTL axis handling where relevant ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).

## 5. Tables, filters, and controls

Date-range picker with presets; global filters apply to all widgets and show as chips; sortable, sticky-header tables with pagination or virtualization; saved views; export (CSV) for analysis; bulk actions bar. Filter state lives in the URL ([`fe-routing-and-url-state`](../fe-routing-and-url-state/SKILL.md)).

## 6. States

Each widget has its own loading skeleton, error with retry, and empty state with guidance ("No activity yet - start your first course"); widgets load independently so one failure does not blank the page ([`fe-loading-states-and-skeletons`](../fe-loading-states-and-skeletons/SKILL.md)). Use per-section cache keys under a dashboard namespace ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md) §2).

## 7. Real-time and freshness

Show "updated 2 min ago"; prefer server push/SSE or long staleTime over tight polling; pause updates when the tab is hidden; avoid layout jumping when values change (tabular figures, fixed widths).

## 8. Performance with data

Aggregate on the server (summary tables/materialized views, cached) rather than shipping raw rows ([`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md), [`cache-strategy-layers`](../cache-strategy-layers/SKILL.md)); downsample time series; lazy-load charts and the charting library per route; canvas/WebGL for > ~5k points; virtualize long tables ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 9. Accessibility of charts

Text alternative summarizing the insight, data table toggle, patterns/labels besides color, keyboard focus on data points, adequate contrast, no information only in tooltips ([`fe-accessibility`](../fe-accessibility/SKILL.md)).

## 10. Admin/back-office specifics

Dense but legible tables, role-based access, audit log, confirmation for destructive bulk actions, inline editing with undo, clear status chips, staff-friendly search; admin analytics read across features without owning tables ([`be-architecture`](../be-architecture/SKILL.md)).

## 11. Checklist

- [ ] Layout answers the top question first; 3-5 KPIs with defined metrics and deltas.
- [ ] Right chart for each question; honest axes; direct labels; accessible colors.
- [ ] Filters in the URL; widgets load/fail independently with skeleton/error/empty states.
- [ ] Server-side aggregation and caching; heavy libs lazy-loaded.
- [ ] Chart text alternatives and keyboard access; consistent number/RTL formatting.
