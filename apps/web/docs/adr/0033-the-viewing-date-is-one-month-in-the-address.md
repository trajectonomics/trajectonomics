---
status: accepted
---

# The viewing date is one month in the address

The Dashboard redesign gives the person one line through time. The top bar sets **which line** (the plan switcher), and the viewing date sets **where you stand** on it: the As-of month by default, movable into the past or the future. Before the As-of a page shows what happened (the ledger's month-end history, [ADR 0027](0027-the-net-worth-history-reaches-back-ten-years-at-most.md)); after it, what the selected plan projects. This ADR decides where the date lives, which row each page picks for it, and the order the pieces are built in.

## Decision

> The viewing date is one month, `?at=YYYY-MM`, kept on every internal link like `?scenario=`. Absent, or equal to the As-of month, it is the As-of month and the address leaves it out. A page whose answer changes with the date picks the row `traj` stated for that month and computes nothing. The Overview sets it by dragging a marker on its net-worth chart; every other page that uses it has a month picker at the right of its title. The Snapshot gains one `projection run --monthly` read per plan, because no read it holds today states net worth month by month after the As-of.

### The parameter

- **Name and form.** `at`, exactly `YYYY-MM` (`^\d{4}-(0[1-9]|1[0-2])$`). Anything else (empty, `2026-13`, `life`, a full date) reads as the As-of month.
- **Kept everywhere for free.** Every internal link already goes through `withSearch` (`src/lib/view/links.ts`, and its twin in `src/hosted/links.ts`), which carries the whole query string, so `at` follows the person like `scenario`, `terms` and `demo`. No link changes.
- **The range** comes from the Snapshot's parameters only, not from its reads or the plan:
  - first month: the month of `params.historyDates[0]`, or the As-of month when the history is empty;
  - last month: the month of `params.horizon` when `params.scenarios` is not empty, else the As-of month.
  A Snapshot made before this ADR has the same range. Tax and Cash flow move through it as usual; the Overview and Net worth show "no figure" after the As-of month, because that Snapshot has no `monthly` read.
- **Clamped when read, never rewritten.** A month outside the range shows as the nearest end of it. The address keeps what was typed until the person moves the date, so a plan switch and back loses nothing. Every write (picker, marker) produces a month inside the range, and writes `""` (removes `at`) for the As-of month.
- **Set with `setQueryParam`**, which replaces the history entry and does not load. Chromium throws after about 100 `history.replaceState` calls in 10 seconds, so the marker writes the address on pointer release, and a held arrow key writes once the keys have been still for 300 ms.

### Which row a page picks

A month runs from its first day, `${month}-01`, to its last, `lastDayOf(month)` (which calls `monthEnd(year, month)` from `src/lib/snapshot/dates.ts`). Both are compared as text against the dates `traj` wrote. Nothing is added to money, and no date is worked out beyond those two.

**Net worth.** `netWorthAt(snapshot, plan, month)` returns one of five kinds:

- `past`, before the As-of month: the history Read at the index in `params.historyDates` whose month is the viewing month (`reads.netWorthHistory[i]`, a full `report networth --as-of <month-end>`).
- `today`, the As-of month: `reads.netWorth`, as today. When the As-of is mid-month, the history's last month-end is the month before, so the As-of month always reads `reads.netWorth`.
- `future`, after the As-of month: the last row of `reads.monthly[plan]` whose date falls in the month. Monthly rows step from the As-of by calendar month and end on the horizon, or on the run-out date when the plan runs out (`packages/core/sim/src/output/build.ts`, the rows it shows), so a month holds one row, or two in the last month, where the later wins.
- `ranOut`, after the As-of month, when no row falls in the month and the plan's `runsOut.date` is before the month's first day. It carries the run-out date and no figure.
- `missing`: a history Read that failed or states no `totals`, a plan with no `monthly` Read or a failed one, or no row in the month otherwise.

Figures are nominal: `netWorth` from a monthly row, never `realNetWorth`. Neither the Overview nor Net worth has a Terms control, and the history Reads state money as it was, so `terms` does not apply to them.

**Periods.** `periodFor(periods, month, runsOut)` takes any `{ from; to }` list in date order (Annual roll-ups, tax years) and returns `{ period, side }`:

- `in`: the period whose `from <= lastDayOf(month) <= to`; else the last period that overlaps the month (`from <= lastDayOf(month)` and `to >= ${month}-01`). The overlap case is the run-out month: `retire-early`'s last roll-up ends 2053-02-01, so Feb 2053 is in it.
- `before`: the month ends before the first period starts. The first period.
- `ranOut`: the month starts after the last period ends and `runsOut` is set. The last period.
- `after`: the month starts after the last period ends and the plan does not run out. The last period. (The range ends at the horizon, where the last period ends, so this is a guard.)
- `null` for an empty list.

**Rule years.** `spendingRules` rows have a `date` and no `to`. For each rule Flow, a row stands from its date until the next row's date, and the last row until the plan's end: `runsOut.date` when the plan runs out, else `params.horizon`. `ruleYearFor(rows, month, end, runsOut)` returns the last row with `date <= lastDayOf(month)` as `in`; the first row as `before` when the month ends before it; the last row as `ranOut` (or `after`, the guard) when the month starts after `end`.

**The words for each side**, in `words.ts`, one sentence under the page's focus, absent for `in`:

| Side | Cash flow | Tax | Withdrawals |
|---|---|---|---|
| `before` | "Mar 2025 is before the plan starts, so this is its first year." | "Tax is projected from 2026, so this is 2026." | "The rule starts in Jun 2050, so this is its first year." |
| `ranOut` | "The plan runs out on 1 Feb 2053, so this is its last year." | same | same |
| `after` | "The plan ends on 31 Dec 2053, so this is its last year." | same | same |

The Cash flow `in` case also says which roll-up holds the month, because roll-ups run from the As-of's anniversary, not calendar years (`packages/core/sim/src/output/periods.ts`): "Mar 2031 is in the year from 31 Oct 2030 to 30 Oct 2031." Tax years are calendar years, so Jan to Sep 2026 are inside the Demo's first tax year, 2026, and need no sentence.

### Why a new read

`projection run --monthly` is the only read that states net worth at each month after the As-of (`monthlyRow`). Today no Snapshot holds it: `params.monthly` is false in the Demo (`scripts/demo-run.ts`) and by default in `traj dashboard` (`apps/cli/src/dashboard/leaf.ts`). Turning `--monthly` on in the main run is not an option: with `--accounts` it also states every Account's value every month (cli ADR 0060), which would grow the Demo snapshot by about 0.9 MB. So each plan gets a second, bare run:

- `projection run --scenario=<name> <projectionFlags> --monthly --json`, the already allowlisted leaf, held as `reads.monthly[<name>]` (`z.record(z.string(), readOf(projectionRun)).default({})` in `snapshotReads`, so an older Snapshot still opens). It is planned with the projections in `stage-two-projections.ts` (`planMonthly`), so every reread that runs the projections runs it too.
- Its cost in the Demo, from the sizes of its rows: about 82 KB of monthly rows, 12 KB of roll-ups and 32 KB of tax years per plan, about 0.5 MB over four plans on a 1.65 MB file. The Demo snapshot is generated and gitignored ([ADR 0021](0021-the-demo-snapshot-is-generated-at-build-and-not-committed.md)), so no size limit applies; the pull request states the real figure and the extra `traj` time.
- `params.monthly` is left as it is: the pages read only `reads.monthly`.

### The pages

| Page | What the viewing date does | Past month | Future month |
|---|---|---|---|
| Overview `/` | Sets the title's offset and the marker | history Read, the total in the plan's currency | `monthly` row, `netWorth` |
| Net worth `/net-worth/` | Changes the answer | history Read: focus, composition and accounts table of that month-end | `monthly` row: focus only, with "Accounts are shown up to today." in place of the composition |
| Cash flow `/cash-flow/` | Changes the answer: `periodFor` over the roll-ups | the first roll-up, `before` sentence | the roll-up that holds it |
| Tax `/tax/` | Changes the answer: `periodFor` over the shown Return's tax years | `before` sentence when the month ends before the first tax year | the tax year that holds it |
| Withdrawals `/optimize/withdrawals/` | Changes the answer: the focus reads the first rule's `ruleYearFor` row, and that row is marked in the table | first Rule year, `before` sentence | the Rule year that holds it |
| Estate `/estate/` | Does not apply: its question is what is left at a life event, and it keeps its own Estate date (below) | | |
| Chance of success `/chance/`, Future `/chance/path/` | Does not apply: the chance is of lasting to the horizon, and the fan already shows every year | | |
| Plan `/projection/`, Year by year `/projection/years/` | Does not apply: the answer is the whole plan (the stop date, a run-out), and the table lists every year | | |
| Milestones, FI | Does not apply: the answer is a date | | |
| Compare plans | Does not apply: `projection compare` states its deltas on its own dates | | |
| Reports | Does not apply: it downloads whole tables | | |
| Allowances `/optimize/allowances/` | Does not apply: what can still be put in is a question about the current tax year, and later years are listed below it | | |
| Income, Expenses, Assets and debts, Household, Routing, Plans, New plan | Does not apply: they edit what a plan assumes, not a figure on a date | | |
| Ledger, Health (Records) | Does not apply: Records are the ledger as of the As-of and change with neither the plan nor the date | | |
| Settings (Tax, Assumptions, Display) | Does not apply | | |

The closed list of pages that use the date is `VIEWING_PAGES` in `src/lib/view/viewing-date/pages.ts`. It starts empty, and each slice below adds its page when it wires it, so print and the picker never claim a page that ignores the date. When all are built it is `/`, `/net-worth/`, `/cash-flow/`, `/tax/`, `/optimize/withdrawals/`.

- **Overview cards do not move.** The cards below the focus point keep the As-of figures; the marker carries the figure for the viewing month.
- **Net worth words.** The focus label, by kind:
  - `today`: unchanged, "What are you worth today? 1.21M THB as of 2026-10-31."
  - `past`: "What were you worth at the end of Mar 2025? 1.02M THB as of 2025-03-31."
  - `future`: "What will you be worth at the end of Mar 2031? 3.40M THB on 2031-03-31, in the plan base."
  - `ranOut`: "What will you be worth in Mar 2053? The plan retire-early runs out on 2053-02-01." No figure, no chart point.
  A past month shows every currency the Read totals, as the page does today. A future month shows the one `netWorth` in the run's `currency`. With amounts hidden, the figure is replaced as it is today.
- **Net worth at a past month** hides the profit and loss card and the value sheet (both are about today), and marks the viewing month's row in the month-end table (`bg-secondary`).
- **Tax.** The page filters the tax years by the Return on screen first (`filer`, or no `filer` for a plan's one Return, as `currentSaving` does today), then calls `periodFor`. `pickCurrent` goes; `currentYear`, `focusYear` and `taxBodyOf` take the picked year instead of the As-of (`taxBodyOf(years, tax, month)`, where every caller outside the Tax page passes `monthOf(run.asOf)`). The As-of month picks the same year `pickCurrent` picked. `currentSaving` matches the allowances year with the same filer and `from` as the shown tax year, not the one holding the As-of, so the "Save" mark always belongs to the year on screen.
- **A What-if session** reruns projections without monthly rows ([ADR 0010](0010-the-what-if-session-reads-through-traj-on-loopback.md)). The pickers always read the Snapshot; what a page shows for a lens is unchanged. While a lens is on for the selected plan, the Overview hides its marker (the line is the lens's, the marker's figure would be the saved plan's).
- **A missing row** shows the page's existing failed-read notice for that figure. The range is not narrowed.

### Estate keeps its own date, as `?estate=`

Estate's `at` holds a choice, not a month (`life`, `end`, `milestone:<id>`, an anchor), and its default is the household's life expectancy, which is the page's answer. Opening it on today would answer another question. So the Estate date moves to `?estate=` and the name `at` is the viewing date's alone.

- `estateChoice(estate, at)` in `src/lib/view/estate/choice.ts`: `estate` when it is not empty; else `at` when it is not empty and is not a `YYYY-MM` month (an old link); else `""` (the default).
- The select writes `estate`. An old `at=milestone:car-paid-off` stays in the address until the viewing date is moved; every other page reads it as the As-of month.

### The controls

**The month picker** (`src/components/ui/MonthPicker.svelte`). Not `<input type="month">`: Firefox and desktop Safari show it as a bare text field. It is:

- a `role="group"` with `data-viewing-date`, labelled "Viewing date" (sr-only), holding two native selects, Month (`id="viewing-month-select"`, Jan to Dec) and Year (`id="viewing-year-select"`, every year of the range), each with an sr-only label. A month outside the range in the chosen year is `disabled`; a year change that lands outside the range clamps.
- a text button "Today", shown only when the viewing month is not the As-of month, that removes `at`.
- the select styling the pages already use, so both themes hold, with the focus ring rule of `AGENTS.md`. `print:hidden`.

**Where it sits.** `PageFrame` gains a `viewing?: Snippet<[Snapshot]>` prop, passed through `PageShell`, rendered only when the state is `ready` (the existing `actions` snippet takes no Snapshot and renders in every state, so the picker does not go in it). The header becomes `flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2`, and its right side is one `div` (`flex flex-wrap items-center justify-end gap-x-4 gap-y-2`) holding `actions`, then `viewing`. On Cash flow the "Where money goes →" link stays first and the picker follows it. At 360 px the right side wraps under the title.

**The Overview marker** (`src/components/overview/ViewingMarker.svelte`). The focus chart's SVG is `aria-hidden="true"` (`FocusChartSvg.svelte`), so the marker is not inside it. It is a sibling of that SVG, absolutely positioned over it in the chart's `relative` wrapper, at `left: x / width * 100%` (the SVG stretches to the wrapper's width with `preserveAspectRatio="none"`, and its height is the `height` prop in pixels):

- A vertical rule, a dot on the picked row's value and a label above it: the month and the compact figure ("Jan 2027 · 1.23M", `formatCompact`), or "Mar 2053 · ran out", or "Mar 2031 · no figure". The rule and the dot are drawn in their own `aria-hidden` SVG inside the marker. The exact amount is in `aria-valuetext` and the hover title.
- A `<div role="slider" tabindex="0" data-viewing-marker aria-label="Viewing date" aria-orientation="horizontal">`, `aria-valuemin="0"`, `aria-valuemax` the range's month count less one, `aria-valuenow` the month's index. `aria-valuetext` is the live text, read on every move: "Oct 2026, today, net worth 1,214,900.00 THB", "Jan 2027, in 3 months, net worth …", "Aug 2026, 2 months ago, net worth …", "Mar 2053, in 26 years, the plan has run out", or "Mar 2031, no figure". No separate live region, and the title is not live, so nothing is read twice.
- Keys: ArrowRight and ArrowUp one month later, ArrowLeft and ArrowDown one month earlier, PageUp one year later, PageDown one year earlier, Home the As-of month (the owner's choice; it is not the slider's minimum), End the last month. Each stops at the range's ends.
- Pointer: the slider covers the plot as a transparent hit area with `touch-action: pan-y`, so a vertical swipe still scrolls the page on a phone. A press moves the marker to the nearest month and captures the pointer; a move follows the nearest month; the release writes the address.
- The chart draws the line through the history month-ends, the As-of read and then the `monthly` rows (the roll-up closes when the plan has no `monthly` Read). A history point is the Read's total in the run's `currency`; a Read with no total in it (another currency only, or `totals` null) leaves a gap, and the marker says "no figure" there. No currency is converted. The part before the As-of uses the muted stroke. The axis is the existing date axis (`xOf`), now starting at the first history month-end. The marker's x is `xOf` of the picked row's date.
- The title is #928's greeting with the offset `monthsBetween(asOf, month)`. The Overview shows no picker and no date chip.

**Print.** `printHeading` gains a `viewing: string | null` argument and adds "Viewing Mar 2031" when the page is in `VIEWING_PAGES` and the viewing month is not the As-of month. The picker and the marker's hit area do not print; the marker's label does.

**The hosted Demo.** Everything is in the page and the address, so it needs no twin. The Fence (`src/client/hosted-fence.ts`) keeps the picker's selects on already (`select[id$="-select"]`). Slice 5 adds `"[data-viewing-date] button"` to `READ_CONTROLS` for the Today button, slice 10 adds `"[data-viewing-marker]"`, slice 6 drops `'select[name="year"]'` with the Cash flow year select, and slice 2 points the Estate comment at `?estate=`.

### Where the code goes

Pure (`src/lib/view/viewing-date/`, no `Date`, integer arithmetic on year and month only):

- `month.ts`: `parseMonth(text: string): string | null`, `monthOf(date: string): string`, `addMonthsTo(month: string, count: number): string`, `monthsBetween(from: string, to: string): number`, `firstDayOf(month: string): string`, `lastDayOf(month: string): string` (`monthEnd(Number(year), Number(monthNumber))`).
- `range.ts`: `interface ViewingRange { first: string; asOf: string; last: string }`, `viewingRange(params: SnapshotParams): ViewingRange`, `viewingMonth(raw: string, range: ViewingRange): string` (parse, then clamp; invalid is `asOf`), `atParam(month: string, range: ViewingRange): string` (`""` for `asOf`), `monthIndex(month, range): number`, `monthAt(index, range): string`, `monthCount(range): number`.
- `words.ts`: `offsetWords(offset: number): string` ("today", "in 1 month", "in 3 months", "2 months ago", "in 1 year", "in 2 years", "2 years ago": years when the offset is a multiple of 12), `sideSentence(page: "cashflow" | "tax" | "rule", side, month, period, end)` (the table above), `rollupSentence(month, from, to)`, `netWorthLabel(at: NetWorthAt, month, plan, hidden)`. #928's title calls `offsetWords`: if #928 lands first with its own phrase, the slice that adds `words.ts` moves it here.
- `rows.ts`: `type NetWorthAt = { kind: "today"; read } | { kind: "past"; read } | { kind: "future"; row: MonthlyRow } | { kind: "ranOut"; date: string } | { kind: "missing" }`, `netWorthAt(snapshot, plan, month): NetWorthAt`, `monthlyRowFor(rows, month): MonthlyRow | null`, the generic `periodFor<T extends { from: string; to: string }>(periods: readonly T[], month, runsOut: string | null): { period: T; side: "in" | "before" | "after" | "ranOut" } | null`, and `ruleYearFor(rows, month, end, runsOut)` with the same result shape.
- `pages.ts`: `VIEWING_PAGES` and `usesViewingDate(path: string): boolean`.
- `picker.ts`: `pickerModel(month, range)` → `{ monthValue, yearValue, months: { value, label, disabled }[], years: { value, label }[], moved: boolean }`, and `pickMonth(year: string, monthNumber: string, range): string`.
- `src/lib/view/overview/viewing-marker.ts`: `markerStops(range, dates: (month) => string, rows, endDate, plot): { month: string; x: number }[]`, `nearestMonth(x, stops): string`, `markerKey(key: string, month, range): string | null` (the key table above).

Client: `src/client/viewing-date.svelte.ts`: `setViewingDate(month: string, range: ViewingRange): Promise<void>` (writes `atParam`), and `ViewingDraft`, a class holding the month a drag or held key shows before it is written, with `commitSoon(range)` (300 ms) and `commitNow(range)`.

Routes: each route in `VIEWING_PAGES` passes `at={queryParam("at", "")}` and `onAt={setViewingDate}` to its page component, as `scenario` is passed; the page resolves `viewingMonth(at, viewingRange(snapshot.params))`. The layout passes the resolved month to `printHeading`. Cash flow stops reading `year`; a leftover `?year=` does nothing.

### The slices, in build order

Each is one pull request of at most about 400 changed lines, and each passes `apps/web`'s lint, typecheck and the tests it touches.

**Outside this ADR.** #927 (PR #943) removes the top bar's As-of chip; the viewing date does not depend on it, and no slice touches the top bar. #928 (the Overview greeting) must be merged before slice 10, whose title adds the offset to that greeting.

1. **Core and words.** `month.ts`, `range.ts`, `words.ts`, `pages.ts` (`VIEWING_PAGES` empty) and their tests. Tests, on the Demo's parameters (As-of 2026-10-31, history 2024-11-30 to 2026-10-31, horizon 2053-12-31, four plans): the range is `{ first: "2024-11", asOf: "2026-10", last: "2053-12" }`; `viewingMonth` of `"2099-01"` is `"2053-12"`, of `"2020-01"` `"2024-11"`, of `"life"`, `"2026-13"` and `""` `"2026-10"`; `atParam("2026-10")` is `""`; no history gives `first: "2026-10"`; no plans give `last: "2026-10"`; `lastDayOf("2028-02")` is `"2028-02-29"`; `offsetWords` of 0, 1, 3, −1, −2, 12, 24, −24; every `sideSentence` row of the table.
2. **Estate moves to `?estate=`.** `estateChoice`, the route, the fence comment, and `browser/estate-labels.e2e.ts` moved from `?at=end` to `?estate=end`. Tests: `("", "life")` is `"life"`, `("end", "life")` is `"end"`, `("", "2031-03")` is `""`. Browser: `/estate/?at=milestone:car-paid-off` (an old link) opens with `#estate-date` on `milestone:car-paid-off`, not the default; `/estate/?estate=milestone:car-paid-off&at=2031-03` does too.
3. **The monthly read.** `planMonthly` in `src/lib/snapshot/stage-two-projections.ts`, wired in `src/lib/snapshot/stage-two.ts` and `scripts/run-stages.ts`; `reads.monthly` in `src/lib/contract/snapshot.ts` (defaults to `{}`); `src/lib/snapshot/reads.ts`; the reread path; `leaves.test.ts`; `scripts/contract.test.ts`; and `bunx turbo run check --filter=@trajectonomics/cli --concurrency=2` for `leaf.test.ts`. It also corrects the stale size comments at `scripts/demo-run.ts:27` and `src/lib/snapshot/params.ts:26`: they cite Biome's 1 MiB formatter limit, which no longer applies to the gitignored Demo snapshot. Tests: the plan has one argv per plan ending `--monthly --json` with no `--accounts`; a Snapshot without `monthly` still decodes. The pull request states the Demo snapshot's size before and after.
4. **Row pickers.** `rows.ts` and its tests. Net worth: Demo months `2025-03` (`past`, the 2025-03-31 Read), `2026-10` (`today`), `2027-01` (`future`, the 2027-01-31 row); a mid-month As-of 2026-11-28 reads `2026-10` from history and `2026-11` as `today`; rows dated 2053-11-28, 2053-12-28, 2053-12-31 give 2053-12-31 for `2053-12`; `retire-early` (runs out 2053-02-01) gives `future` with the 2053-02-01 row for `2053-02` and `ranOut` for `2053-03` and `2053-12`; a failed history Read, a Read with `totals: null` and a plan with no `monthly` Read are `missing`. Periods: roll-ups 2026-10-31..2027-10-30 and 2027-10-31..2028-10-30 put `2027-10` in the second, `2026-10` in the first and `2025-03` `before` the first; `retire-early`'s roll-ups put `2053-02` `in` the last (2052-10-31..2053-02-01) and `2053-03` `ranOut`; calendar tax years put `2026-03` `in` 2026 and `2025-12` `before`. Rule years, on `base` (rows 2050-06-01 to 2053-06-01, horizon 2053-12-31): `2026-10` is `before` with the first row, `2050-06` `in` the first row, `2053-12` `in` the last row.
5. **Picker, client, print and Tax.** `picker.ts`, `MonthPicker.svelte`, the `viewing` snippet and the wrapping header in `PageFrame`/`PageShell`, `viewing-date.svelte.ts`, `printHeading`, the fence's Today button, and Tax wired (the filer filter, `periodFor`, `taxBodyOf`/`focusYear` taking the year, `currentSaving` matching it, `pickCurrent` removed). `VIEWING_PAGES` gains `/tax/`. Tests: the tax view model at `2025-12` (before, 2026), `2026-03` and `2030-06` (in), and the `separate` plan's second filer; the saving shown belongs to the shown year. New `browser/viewing-date.e2e.ts`: `/tax/?at=2030-06` shows Jun 2030 in the picker; choosing 2031 writes `at=2031-06`; following the sidebar to Cash flow keeps `at`; Today removes it; at 360 px the picker wraps under the title with no horizontal scroll, in both themes; the print heading reads "Viewing Jun 2030" on Tax and not on Cash flow; the hosted project shows the picker switched on.
6. **Cash flow.** The picker in place of `YearSelect`, the roll-up and side sentences, `/cash-flow/` added to `VIEWING_PAGES`. It changes every consumer of the year select: `YearSelect.svelte` deleted; `CashFlowBody.svelte` (its import and use), `CashFlowView.svelte`, `CashFlowPage.svelte` and `src/routes/cash-flow/+page.svelte` lose `year`/`onYear` and take `at`/`onAt`; `src/components/what-if/figure-pages.svelte.test.ts` passes `at` instead of `year`; `src/components/cashflow/cashflow-view.svelte.test.ts:54` expects the roll-up sentence instead of `name="year"`; `browser/flow-label-probe.e2e.ts` (`otherYear` and the year change) and `browser/flow-label-resize.e2e.ts` select through `#viewing-year-select`; the fence drops `'select[name="year"]'`. Tests on the view model for `2027-10`, `2025-03` and `retire-early` at `2053-03`; the print check of Cash flow at `?at=2030-06` finds "Viewing Jun 2030".
7. **Net worth.** `netWorthPageView` takes the picked kind; the past, future and ran-out words; the marked month row; `/net-worth/` added to `VIEWING_PAGES`. Tests: past month composition from the history Read, future month hides the composition with its sentence, `retire-early` at `2053-03` shows the ran-out label and no figure; browser check at `?at=2025-06` and `?at=2030-06`.
8. **Withdrawals.** `ruleYearFor` in the focus and the marked row; `/optimize/withdrawals/` added to `VIEWING_PAGES`. Tests on `base` for a month before the first row (with its sentence), in the first row and in the last row.
9. **The Overview line.** History, the As-of read and the `monthly` rows in the focus chart, the currency gaps, the muted past, the axis from the first month-end. Tests in `focus-chart.test.ts`: the first point is the first history month-end at `plot.left`; a history Read in another currency leaves a gap; with no `monthly` Read the line is the roll-up closes as before; `browser/marker-labels.e2e.ts` still passes.
10. **The Overview marker and title** (after #928). `viewing-marker.ts`, `ViewingMarker.svelte` as the overlay, the draft, the title's offset, the fence's `[data-viewing-marker]`, `/` added to `VIEWING_PAGES`. Tests: `markerKey` for every key at the range's ends; `nearestMonth`. Browser: the slider is in the accessibility tree (not under the `aria-hidden` SVG); focus it, ArrowRight reads "Nov 2026, in 1 month, net worth …" and writes `at=2026-11` after 300 ms; PageUp moves twelve months; Home removes `at`; a drag writes once on release; at 360 px a vertical swipe on the chart scrolls the page; the ring is `solid`; the title reads "…where you'll be in 1 month".

## Considered Options

- **`<input type="month">`.** Rejected: Firefox and desktop Safari draw a text field with no picker.
- **`--monthly` on the main run.** Rejected: with `--accounts` it also states each Account every month, about 0.9 MB more in the Demo.
- **Net worth after the As-of from the roll-up that holds the month.** Rejected: twelve months would show one figure, and the marker would not move.
- **The range ends at the As-of when the Snapshot has no `monthly` read.** Rejected: Tax and Cash flow need no monthly read, and an older Snapshot would lose the date on them.
- **The marker inside the chart's SVG.** Rejected: the SVG is `aria-hidden`, so a screen reader would never reach the slider.
- **The picker in the `actions` snippet.** Rejected: `actions` renders before the Snapshot is ready and receives none.
- **Estate's `at` becomes the viewing date.** Rejected: Estate would open on today and lose its life-expectancy answer, and its milestone and anchor choices are not months.
- **Rewrite an out-of-range `at` in the address.** Rejected: it needs an effect that writes the address on every Snapshot change, and a plan switch and back would lose the month.
- **A picker on every page.** Rejected: on a page whose answer does not change with the date, a control that changes nothing costs attention (DESIGN_PRINCIPLES 7).

## Consequences

- A link with `?at=` opens every page that uses it on that month, in the loopback Dashboard and the hosted Demo alike.
- Every figure for a month is a row `traj` stated, found by date ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)); a month with no row says so, and a month after a run-out says the plan has run out.
- The Snapshot grows by one bare run per plan.
- When the monthly cash flow (D3) lands, Cash flow picks the month's own row and drops the roll-up sentence; the rest of this ADR stays.
