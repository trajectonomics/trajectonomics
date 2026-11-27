<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { compactCount, displayCount } from "../lib/format"
import {
	PEAK_COLUMNS,
	type PeakColumn,
	type PeakTableRow,
	peakColumnMax,
	peakOf,
	peakShare,
	peakSpoken,
	peakTableRows,
} from "../lib/plan-peaks"
import type { PlanPeak } from "../lib/types"
import PlanMark from "./PlanMark.svelte"

let {
	plans,
	ranked,
	day,
}: {
	/** The peaks API's plans. */
	plans: PlanPeak[]
	/** The summary's ranked plans, whose order this table follows. */
	ranked: { plan: string }[]
	/** The window's last day, whose tier each plan's name carries. */
	day: string
} = $props()

const rows = $derived(peakTableRows(ranked, plans, day))
const maxima = $derived({
	fiveHours: peakColumnMax(rows, "fiveHours"),
	sevenDays: peakColumnMax(rows, "sevenDays"),
	thirtyDays: peakColumnMax(rows, "thirtyDays"),
})
</script>

{#snippet identity(row: PeakTableRow)}
	<span class="peaks-identity">
		<PlanMark plan={row.plan} name={row.planName} size={24} />
		<span class="peaks-name">{row.planName}</span>
		{#if row.tier !== null}
			<span class="plan-tier" title={row.tier.note ?? undefined}>{row.tier.name}</span>
		{/if}
	</span>
{/snippet}

{#snippet cell(row: PeakTableRow, column: PeakColumn)}
	{@const peak = peakOf(row, column.key)}
	{#if peak === null}
		<div class="peaks-cell">
			<span class="peaks-figure peaks-figure-empty" aria-hidden="true">–</span>
			<span class="visually-hidden">
				{column.key === "fiveHours" ? "not reported hourly" : "not reported"}
			</span>
		</div>
	{:else}
		<div class="peaks-cell" title={`${displayCount(peak.tokens)} tokens from ${peak.fromDay}`}>
			<span class="peaks-figure" aria-hidden="true">≥ {compactCount(peak.tokens)}</span>
			<span class="peaks-track" aria-hidden="true">
				<span class="peaks-bar" style={`width: ${peakShare(peak, maxima[column.key])}%`}></span>
			</span>
			<span class="visually-hidden">{peakSpoken(peak, column)}</span>
		</div>
	{/if}
{/snippet}

<div class="plan-peaks">
	<table class="peaks-table peaks-table-wide">
		<caption class="visually-hidden">
			The most tokens each plan used in one window
		</caption>
		<thead>
			<tr>
				<th scope="col"><span class="visually-hidden">Plan</span></th>
				{#each PEAK_COLUMNS as column (column.key)}
					<th scope="col">{column.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.plan)}
				<tr>
					<th scope="row">{@render identity(row)}</th>
					{#each PEAK_COLUMNS as column (column.key)}
						<td>{@render cell(row, column)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<table class="peaks-table peaks-table-phone">
		<caption class="visually-hidden">
			The most tokens each plan used in one window
		</caption>
		<thead>
			<tr>
				{#each PEAK_COLUMNS as column (column.key)}
					<th scope="col">{column.label}</th>
				{/each}
			</tr>
		</thead>
		{#each rows as row (row.plan)}
			<tbody>
				<tr class="peaks-plan-row">
					<th scope="rowgroup" colspan="3">{@render identity(row)}</th>
				</tr>
				<tr class="peaks-figures-row">
					{#each PEAK_COLUMNS as column (column.key)}
						<td>{@render cell(row, column)}</td>
					{/each}
				</tr>
			</tbody>
		{/each}
	</table>

	<p class="peaks-note">
		<span aria-hidden="true">≥</span>
		<span class="visually-hidden">At least</span>
		the most we used in one window, not the plan's limit
	</p>
</div>
