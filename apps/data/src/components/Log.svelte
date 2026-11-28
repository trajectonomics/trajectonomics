<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { LogState } from "../client/log.svelte"
import { dayOnlyNote, dayOnlyPlans, daySeries, hourSeries, weekSeries } from "../lib/buckets"
import { daysFromCollection } from "../lib/collecting"
import {
	BUCKETS,
	type BucketKind,
	PERIODS,
	type PeriodKey,
	periodEntry,
	resolveBucket,
} from "../lib/period"
import { logViewSearch, readAsOf, readLogView } from "../lib/query"
import { LOG_PATH } from "../lib/site"
import { usageTable } from "../lib/table"
import { utcDay } from "../lib/window"
import FreshnessLine from "./FreshnessLine.svelte"
import UsageChart from "./UsageChart.svelte"
import UsageTable from "./UsageTable.svelte"

const state = new LogState()

onMount(() => {
	const view = readLogView(window.location.search)
	state.period = view.period
	state.bucket = view.bucket
	void state.load(readAsOf(window.location.search))
})

const days = $derived(state.days)
const chartDays = $derived(
	days === null ? [] : daysFromCollection(state.health?.collectingSince, days.days),
)
const chartFrom = $derived(chartDays[0] ?? days?.from ?? "")
const usageRows = $derived(state.usage?.rows ?? [])
const hourlyRows = $derived(state.hourly?.rows ?? [])
const allowedBuckets = $derived(periodEntry(state.period).buckets)
const lastHour = $derived(
	state.requestedAsOf === null && days !== null && days.to === utcDay(Date.now())
		? `${new Date(Date.now()).toISOString().slice(0, 13)}:00:00.000Z`
		: null,
)
const series = $derived(
	state.bucket === "hour"
		? hourSeries(hourlyRows, chartDays, lastHour)
		: state.bucket === "week"
			? weekSeries(usageRows, chartDays)
			: daySeries(usageRows, chartDays),
)
const note = $derived(state.bucket === "hour" ? dayOnlyNote(dayOnlyPlans(usageRows)) : null)
const rows = $derived(state.usage === null ? [] : usageTable(state.usage.rows))
const liveHref = $derived(
	`${LOG_PATH}${logViewSearch({ period: state.period, bucket: state.bucket }, null)}`,
)

function apply(period: PeriodKey, bucket: BucketKind): void {
	const view = { period, bucket: resolveBucket(period, bucket) }
	if (view.period === state.period && view.bucket === state.bucket) return
	state.setView(view.period, view.bucket)
	history.replaceState(
		null,
		"",
		`${window.location.pathname}${logViewSearch(view, state.requestedAsOf)}`,
	)
}

function choosePeriod(period: PeriodKey): void {
	apply(period, resolveBucket(period, state.bucket))
}

function chooseBucket(bucket: BucketKind): void {
	apply(state.period, bucket)
}
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
		liveHref={liveHref}
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
		<div class="log-controls">
			<fieldset class="view-group">
				<legend class="meta-label">Period</legend>
				<div class="segmented">
					{#each PERIODS as entry (entry.key)}
						<label class="segment">
							<input
								class="segment-input"
								type="radio"
								name="period"
								value={entry.key}
								checked={state.period === entry.key}
								onchange={() => choosePeriod(entry.key)}
							/>
							<span class="segment-label">{entry.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			<fieldset class="view-group">
				<legend class="meta-label">By</legend>
				<div class="segmented">
					{#each BUCKETS as choice (choice.key)}
						<label class="segment">
							<input
								class="segment-input"
								type="radio"
								name="bucket"
								value={choice.key}
								checked={state.bucket === choice.key}
								disabled={!allowedBuckets.includes(choice.key)}
								onchange={() => chooseBucket(choice.key)}
							/>
							<span class="segment-label">{choice.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		</div>
		<section class="section-block" aria-labelledby="chart-title">
			<h2 id="chart-title" class="meta-label section-title">Tokens per {state.bucket}</h2>
			<UsageChart {series} from={chartFrom} to={days.to} unit={state.bucket} />
			{#if note !== null}
				<p class="log-note">{note}</p>
			{/if}
		</section>
		<section class="section-block" aria-labelledby="table-title">
			<h2 id="table-title" class="meta-label section-title">Tokens per plan and model</h2>
			<UsageTable {rows} from={chartFrom} to={days.to} />
		</section>
	{/if}
</section>
