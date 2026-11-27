<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import type { PlanCatalog } from "@trajectonomics/data-collector/tier-catalog"
import { compactCount, displayCount } from "../lib/format"
import { defaultTier, planCatalog } from "../lib/plan-catalog"
import {
	figureShare,
	PEAK_COLUMNS,
	type PeakColumn,
	type PeakTableRow,
	peakSpoken,
	peakTableRows,
} from "../lib/plan-peaks"
import {
	factorLabel,
	figuresColumnMax,
	type TierFigures,
	tagFactor,
	tierFigures,
} from "../lib/tier-estimate"
import type { PlanPeak } from "../lib/types"
import PlanMark from "./PlanMark.svelte"
import PlanPeaksInfo from "./PlanPeaksInfo.svelte"

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

type RowView = {
	row: PeakTableRow
	catalog: PlanCatalog | null
	picked: string | null
	figures: TierFigures
}

/** The tier each plan's picker shows; a plan absent here uses its current tier. */
const chosen = $state<Record<string, string>>({})

const rows = $derived(peakTableRows(ranked, plans, day))

function viewOf(row: PeakTableRow): RowView {
	const catalog = planCatalog(row.plan)
	const current = row.tier?.name ?? null
	const picked =
		catalog === null ? current : (chosen[row.plan] ?? defaultTier(current, row.measured, catalog))
	const figures = tierFigures(
		{
			tier: current,
			fiveHours: row.fiveHours,
			sevenDays: row.sevenDays,
			thirtyDays: row.thirtyDays,
		},
		picked,
		row.measured,
		catalog,
	)
	return { row, catalog, picked, figures }
}

const views = $derived(rows.map(viewOf))
const maxima = $derived({
	fiveHours: figuresColumnMax(
		views.map((view) => view.figures),
		"fiveHours",
	),
	sevenDays: figuresColumnMax(
		views.map((view) => view.figures),
		"sevenDays",
	),
	thirtyDays: figuresColumnMax(
		views.map((view) => view.figures),
		"thirtyDays",
	),
})

function choose(plan: string, tier: string): void {
	chosen[plan] = tier
}
</script>

{#snippet identity(view: RowView)}
	<span class="peaks-identity">
		<PlanMark plan={view.row.plan} name={view.row.planName} size={24} />
		<span class="peaks-identity-text">
			<span class="peaks-name-line">
				<span class="peaks-name">{view.row.planName}</span>
				{#if view.catalog !== null}
					<select
						class="peaks-tier-picker"
						aria-label={`${view.row.planName} plan`}
						onchange={(event) => choose(view.row.plan, event.currentTarget.value)}
					>
						{#each view.catalog.tiers as tier (tier.name)}
							<option value={tier.name} selected={tier.name === view.picked}>{tier.name}</option>
						{/each}
					</select>
				{:else if view.row.tier !== null}
					<span class="plan-tier" title={view.row.tier.note ?? undefined}>
						{view.row.tier.name}{#if view.row.tier.note}<span class="visually-hidden">, {view.row.tier.note}</span>{/if}
					</span>
				{/if}
			</span>
			{#if view.figures.kind === "estimated"}
				<span class="peaks-tag">
					Estimated from {view.figures.fromTier} {factorLabel(tagFactor(view.figures))}
				</span>
			{:else if view.figures.kind === "unknown"}
				<span class="peaks-tag peaks-tag-muted">No stated multiplier</span>
			{/if}
		</span>
	</span>
{/snippet}

{#snippet cell(view: RowView, column: PeakColumn)}
	{@const figures = view.figures}
	{#if figures.kind === "unknown"}
		<div class="peaks-cell">
			<span class="peaks-figure peaks-figure-empty" aria-hidden="true">–</span>
			<span class="visually-hidden">No stated multiplier for this window</span>
		</div>
	{:else}
		{@const current = figures.cells[column.key]}
		{#if current.kind === "not-stated"}
			<div class="peaks-cell" title={`${view.row.planName} states no multiplier for this window`}>
				<span class="peaks-figure peaks-figure-empty" aria-hidden="true">–</span>
				<span class="visually-hidden">{view.row.planName} states no multiplier for this window</span>
			</div>
		{:else if current.kind === "not-measured"}
			<div class="peaks-cell" title="No measured figure for this window">
				<span class="peaks-figure peaks-figure-empty" aria-hidden="true">–</span>
				<span class="visually-hidden">No measured figure for this window</span>
			</div>
		{:else if current.kind === "measured"}
			{#if current.peak === null}
				<div class="peaks-cell">
					<span class="peaks-figure peaks-figure-empty" aria-hidden="true">–</span>
					<span class="visually-hidden">
						{column.key === "fiveHours" ? "not reported hourly" : "not reported"}
					</span>
				</div>
			{:else}
				<div
					class="peaks-cell"
					title={`${displayCount(current.peak.tokens)} tokens from ${current.peak.fromDay}`}
				>
					<span class="peaks-figure" aria-hidden="true">
						≥ {compactCount(current.peak.tokens)}
					</span>
					<span class="peaks-track" aria-hidden="true">
						<span
							class="peaks-bar"
							style={`width: ${figureShare(current.peak.tokens, maxima[column.key])}%`}
						></span>
					</span>
					<span class="visually-hidden">{peakSpoken(current.peak, column)}</span>
				</div>
			{/if}
		{:else}
			<div
				class="peaks-cell"
				title={`${displayCount(current.tokens)} tokens, estimated from ${current.fromTier}`}
			>
				<span class="peaks-figure peaks-figure-estimated" aria-hidden="true">
					≈ {compactCount(current.tokens)}
				</span>
				<span class="peaks-track" aria-hidden="true">
					<span
						class="peaks-bar peaks-bar-estimated"
						style={`width: ${figureShare(current.tokens, maxima[column.key])}%`}
					></span>
				</span>
				<span class="visually-hidden">
					estimated, at least {displayCount(current.tokens)} tokens in {column.spoken}, from {current.fromTier}
				</span>
			</div>
		{/if}
	{/if}
{/snippet}

<div class="plan-peaks">
	<h2 class="meta-label section-title peaks-title">
		<span id="peaks-title">What each plan gives</span>
		<button
			class="peaks-info"
			type="button"
			popovertarget="peaks-info-panel"
			aria-label="How these numbers are worked out"
		>
			<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
				<circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" stroke-width="1.25" />
				<path
					d="M8 7.25v4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
				<circle cx="8" cy="4.75" r="1" fill="currentColor" />
			</svg>
		</button>
	</h2>
	<PlanPeaksInfo />

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
			{#each views as view (view.row.plan)}
				<tr class:peaks-row-estimated={view.figures.kind === "estimated"}>
					<th scope="row">{@render identity(view)}</th>
					{#each PEAK_COLUMNS as column (column.key)}
						<td>{@render cell(view, column)}</td>
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
		{#each views as view (view.row.plan)}
			<tbody class:peaks-row-estimated={view.figures.kind === "estimated"}>
				<tr class="peaks-plan-row">
					<th scope="rowgroup" colspan="3">{@render identity(view)}</th>
				</tr>
				<tr class="peaks-figures-row">
					{#each PEAK_COLUMNS as column (column.key)}
						<td>{@render cell(view, column)}</td>
					{/each}
				</tr>
			</tbody>
		{/each}
	</table>

	<p class="peaks-note">
		<span class="visually-hidden">At least: </span>
		<span aria-hidden="true">≥</span> what we measured, or <span aria-hidden="true">≈</span> estimated
		from a tier we measured — never the plan's limit
	</p>
</div>
