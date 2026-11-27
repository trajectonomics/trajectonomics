<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import type { PlanCatalog } from "@trajectonomics/data-collector/tier-catalog"
import { peakCellChoice } from "../lib/collecting"
import { compactCount, displayCount } from "../lib/format"
import { PEAK_COLUMNS, type PeakColumn, peakNote, peakSpoken } from "../lib/peak-words"
import { defaultTier, planCatalog } from "../lib/plan-catalog"
import { limitCell } from "../lib/plan-limits"
import { MONTH_FROM_WEEK } from "../lib/plan-month"
import { figureShare, limitsOf, type PeakTableRow, peakTableRows } from "../lib/plan-peaks"
import {
	cellTokens,
	factorLabel,
	figuresColumnMax,
	type TierFigures,
	tagFactor,
	tierFigures,
} from "../lib/tier-estimate"
import type { Limits, PlanPeak } from "../lib/types"
import PlanMark from "./PlanMark.svelte"
import PlanPeaksInfo from "./PlanPeaksInfo.svelte"

let {
	plans,
	ranked,
	day,
	planSince = {},
	heading = true,
}: {
	/** The peaks API's plans. */
	plans: PlanPeak[]
	/** The summary's ranked plans, whose order this table follows. */
	ranked: { plan: string; cacheRead?: number | null }[]
	/** The window's last day, whose tier each plan's name carries. */
	day: string
	/** The first collected UTC day per plan; absent on an old health body. */
	planSince?: Record<string, string>
	/** Whether the section's own heading and info control are drawn above the table. */
	heading?: boolean
} = $props()

type RowView = {
	row: PeakTableRow
	catalog: PlanCatalog | null
	picked: string | null
	figures: TierFigures
	limits: Limits | null
}

/** The tier each plan's picker shows; a plan absent here uses its current tier. */
const chosen = $state<Record<string, string>>({})

const rows = $derived(peakTableRows(ranked, plans, day))
/** Plans whose source reports no cache reads, so their figures hold them. */
const unsplit = $derived(
	new Set(ranked.filter((entry) => entry.cacheRead === null).map((entry) => entry.plan)),
)

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
	return { row, catalog, picked, figures, limits: limitsOf(row, picked) }
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
			{:else if view.catalog === null}
				<span class="peaks-tag peaks-tag-muted">Most we used</span>
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
		{@const waiting = peakCellChoice(
			column.key,
			cellTokens(current) !== null,
			planSince[view.row.plan],
			day,
			MONTH_FROM_WEEK.has(view.row.plan),
		)}
		{@const estimate = limitCell(
			view.limits?.[column.key],
			column,
			cellTokens(current),
			waiting.kind === "collecting" ? waiting : null,
		)}
		{#if estimate !== null}
			<div class="peaks-cell" title={estimate.spoken}>
				<span
					class="peaks-figure"
					class:peaks-figure-rough={estimate.limit.rough}
					aria-hidden="true">{estimate.figure}</span
				>
				<span class="peaks-meta" aria-hidden="true">{estimate.meta}</span>
				<span class="peaks-track" aria-hidden="true">
					<span
						class="peaks-bar"
						class:peaks-bar-rough={estimate.limit.rough}
						style={`width: ${estimate.share}%`}
					></span>
				</span>
				{#if estimate.collecting !== null}
					<span class="peaks-meta" aria-hidden="true">
						{estimate.collecting.seen} of {estimate.collecting.of} days
					</span>
				{/if}
				<span class="visually-hidden">
					{estimate.spoken}{#if estimate.collecting !== null}, {estimate.collecting.seen} of {estimate.collecting.of} days seen{/if}
				</span>
			</div>
		{:else if waiting.kind === "collecting"}
			<div class="peaks-cell">
				<span class="peaks-collecting" aria-hidden="true">{waiting.seen} of {waiting.of} days</span>
				{#if waiting.note !== null}
					<span class="peaks-meta" aria-hidden="true">{waiting.note}</span>
				{/if}
				<span class="peaks-track" aria-hidden="true">
					<span
						class="peaks-bar peaks-bar-collecting"
						style={`width: ${figureShare(waiting.seen, waiting.of)}%`}
					></span>
				</span>
				<span class="visually-hidden">
					Still collecting: {waiting.seen} of {waiting.of} days seen{#if waiting.note !== null}, {waiting.note}{/if}
				</span>
			</div>
		{:else if current.kind === "not-stated"}
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
				{@const note = peakNote(current.peak, column.key, !unsplit.has(view.row.plan))}
				<div class="peaks-cell" title={peakSpoken(current.peak, column)}>
					<span class="peaks-figure" aria-hidden="true">
						{compactCount(current.peak.tokens)}
					</span>
					{#if note !== null}
						<span class="peaks-meta" aria-hidden="true">{note}</span>
					{/if}
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
			{@const derived = MONTH_FROM_WEEK.has(view.row.plan) && column.key === "thirtyDays"}
			<div
				class="peaks-cell"
				title={`${displayCount(current.tokens)} tokens, estimated from ${current.fromTier}${derived ? ", the week × 30/7" : ""}`}
			>
				<span class="peaks-figure peaks-figure-estimated" aria-hidden="true">
					≈ {compactCount(current.tokens)}
				</span>
				{#if derived}
					<span class="peaks-meta" aria-hidden="true">week × 30/7</span>
				{/if}
				<span class="peaks-track" aria-hidden="true">
					<span
						class="peaks-bar peaks-bar-estimated"
						style={`width: ${figureShare(current.tokens, maxima[column.key])}%`}
					></span>
				</span>
				<span class="visually-hidden">
					estimated, {displayCount(current.tokens)} tokens in {column.spoken}, from {current.fromTier}{derived
						? ", the week × 30/7"
						: ""}
				</span>
			</div>
		{/if}
	{/if}
{/snippet}

<div class="plan-peaks">
	{#if heading}
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
	{/if}

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
		Most we used in a window once it is full, or <span aria-hidden="true">≈</span> estimated from a
		tier we measured. <span aria-hidden="true">≈</span> at 100%: worked out from the plan's own usage
		meter, tokens used ÷ points the meter moved × 100.
	</p>
</div>
