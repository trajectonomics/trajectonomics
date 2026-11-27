<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { OverviewState } from "../client/overview.svelte"
import { freshness } from "../lib/freshness"
import { planTotals } from "../lib/plan-totals"
import { readAsOf } from "../lib/query"
import { chartSeries } from "../lib/series"
import { DATA_PATH } from "../lib/site"
import { usageTable } from "../lib/table"
import PlanBreakdown from "./PlanBreakdown.svelte"
import PlanSummary from "./PlanSummary.svelte"
import UsageChart from "./UsageChart.svelte"
import UsageTable from "./UsageTable.svelte"

const state = new OverviewState()

$effect(() => {
	void state.load(readAsOf(window.location.search))
})

const days = $derived(state.days)
const series = $derived(
	state.usage === null || days === null ? [] : chartSeries(state.usage.rows, days.days),
)
const rows = $derived(state.usage === null ? [] : usageTable(state.usage.rows))
const totals = $derived(
	state.usage === null || days === null ? [] : planTotals(state.usage.rows, days.to),
)
const fresh = $derived(state.health === null ? null : freshness(state.health))
</script>

<section class="overview" aria-labelledby="overview-title">
	<header class="masthead">
		<p class="meta-label">Measured by us</p>
		<h1 id="overview-title" class="masthead-title">Trajectonomics Data</h1>
		<p class="overview-lede">Tokens we used on each AI subscription plan, measured by us.</p>
	</header>

	{#if fresh !== null}
		<p class="freshness-line">
			<span>{fresh.label}{#if fresh.at !== null}{` (${fresh.at})`}{/if}</span>
			{#if fresh.note !== null}<span class="freshness-note">{fresh.note}</span>{/if}
		</p>
	{/if}

	{#if state.requestedAsOf !== null && state.usage !== null}
		<p class="as-of">
			<span>As of {state.requestedAsOf} · method v{state.usage.methodVersion}</span>
			<a href={DATA_PATH}>Live view</a>
		</p>
	{/if}

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
		<section class="section-block" aria-labelledby="plans-title">
			<h2 id="plans-title" class="meta-label section-title">Tokens we got from each plan</h2>
			<PlanSummary {totals} />
		</section>

		<section class="section-block" aria-labelledby="details-title">
			<h2 id="details-title" class="meta-label section-title">Details</h2>
			<section class="detail-block" aria-labelledby="chart-title">
				<h3 id="chart-title" class="meta-label detail-title">Tokens per day</h3>
				<UsageChart {series} from={days.from} to={days.to} />
			</section>
			<section class="detail-block" aria-labelledby="breakdown-title">
				<h3 id="breakdown-title" class="meta-label detail-title">Where the tokens went</h3>
				<PlanBreakdown {totals} from={days.from} to={days.to} />
			</section>
			<section class="detail-block" aria-labelledby="table-title">
				<h3 id="table-title" class="meta-label detail-title">Tokens per plan and model</h3>
				<UsageTable {rows} from={days.from} to={days.to} />
			</section>
		</section>
	{/if}
</section>
