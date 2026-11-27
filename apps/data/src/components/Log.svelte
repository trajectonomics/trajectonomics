<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { LogState } from "../client/log.svelte"
import { daysFromCollection } from "../lib/collecting"
import { readAsOf } from "../lib/query"
import { chartSeries } from "../lib/series"
import { LOG_PATH } from "../lib/site"
import { usageTable } from "../lib/table"
import FreshnessLine from "./FreshnessLine.svelte"
import UsageChart from "./UsageChart.svelte"
import UsageTable from "./UsageTable.svelte"

const state = new LogState()

$effect(() => {
	void state.load(readAsOf(window.location.search))
})

const days = $derived(state.days)
const chartDays = $derived(
	days === null ? [] : daysFromCollection(state.health?.collectingSince, days.days),
)
const chartFrom = $derived(chartDays[0] ?? days?.from ?? "")
const series = $derived(state.usage === null ? [] : chartSeries(state.usage.rows, chartDays))
const rows = $derived(state.usage === null ? [] : usageTable(state.usage.rows))
</script>

<section class="overview log-page" aria-labelledby="log-title">
	<header class="masthead masthead-lite">
		<p class="meta-label">Measured by us</p>
		<h1 id="log-title" class="masthead-title">Log</h1>
	</header>

	<FreshnessLine
		health={state.health}
		day={days?.to ?? null}
		requestedAsOf={state.requestedAsOf}
		methodVersion={state.usage?.methodVersion ?? null}
		liveHref={LOG_PATH}
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
		<section class="section-block" aria-labelledby="chart-title">
			<h2 id="chart-title" class="meta-label section-title">Tokens per day</h2>
			<UsageChart {series} from={chartFrom} to={days.to} />
		</section>
		<section class="section-block" aria-labelledby="table-title">
			<h2 id="table-title" class="meta-label section-title">Tokens per plan and model</h2>
			<UsageTable {rows} from={chartFrom} to={days.to} />
		</section>
	{/if}
</section>
