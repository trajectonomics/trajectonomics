<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { OverviewState } from "../client/overview.svelte"
import { cacheRateRows } from "../lib/cache-rate"
import { daysFromCollection } from "../lib/collecting"
import { planBars } from "../lib/plan-bars"
import { planTotals } from "../lib/plan-totals"
import { readAsOf } from "../lib/query"
import { DATA_PATH } from "../lib/site"
import { cachePoints, valuePoints } from "../lib/value-points"
import { weeklyFigures } from "../lib/weekly"
import FreshnessLine from "./FreshnessLine.svelte"
import PlanSection from "./PlanSection.svelte"
import SectionNav from "./SectionNav.svelte"
import TokensSection from "./TokensSection.svelte"
import ValueSection from "./ValueSection.svelte"

const state = new OverviewState()

$effect(() => {
	void state.load(readAsOf(window.location.search))
})

const days = $derived(state.days)
const usageRows = $derived(state.usage?.rows ?? [])
const peaks = $derived(state.peaks?.plans ?? [])
const totals = $derived(state.usage === null || days === null ? [] : planTotals(usageRows, days.to))
const chartDays = $derived(
	days === null ? [] : daysFromCollection(state.health?.collectingSince, days.days),
)
const chartFrom = $derived(chartDays[0] ?? days?.from ?? "")
const weekBars = $derived(
	days === null
		? []
		: planBars(peaks, {
				day: days.to,
				planSince: state.health?.planSince ?? {},
				window: "sevenDays",
			}),
)
const monthBars = $derived(
	days === null
		? []
		: planBars(peaks, {
				day: days.to,
				planSince: state.health?.planSince ?? {},
				window: "thirtyDays",
			}),
)
const week = $derived(weeklyFigures(weekBars, monthBars))
const valueDots = $derived(valuePoints(week, usageRows))
const cacheRows = $derived(cacheRateRows(totals, usageRows))
const cacheDots = $derived(cachePoints(valueDots, cacheRows))
</script>

<section class="overview" aria-labelledby="overview-title">
	<header class="masthead">
		<p class="meta-label">Measured by us</p>
		<h1 id="overview-title" class="masthead-title">Trajectonomics Data</h1>
	</header>

	<FreshnessLine
		health={state.health}
		day={days?.to ?? null}
		requestedAsOf={state.requestedAsOf}
		methodVersion={state.usage?.methodVersion ?? null}
		liveHref={DATA_PATH}
	/>

	{#if state.status === "loading"}
		<div class="state-panel" role="status">
			<p>Loading data…</p>
		</div>
	{:else if state.status === "error"}
		<div class="state-panel" role="alert">
			<p>Could not load the data</p>
			<button class="retry-button" type="button" onclick={() => void state.load()}>Retry</button>
		</div>
	{:else if state.usage !== null && state.usage.rows.length === 0}
		<div class="state-panel">
			<p>No data yet</p>
			<button class="retry-button" type="button" onclick={() => void state.load()}>Retry</button>
		</div>
	{:else if days !== null}
		<div class="data-shell">
			<SectionNav />
			<div class="data-column">
				<PlanSection
					plans={peaks}
					ranked={totals}
					day={days.to}
					planSince={state.health?.planSince ?? {}}
				/>
				<ValueSection week={week} rows={usageRows} />
				<TokensSection
					{totals}
					{cacheRows}
					{cacheDots}
					from={chartFrom}
					to={days.to}
				/>
			</div>
		</div>
	{/if}
</section>
