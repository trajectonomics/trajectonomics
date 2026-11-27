<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.

import { barGeometry } from "../lib/bar-chart"
import {
	barAriaLabel,
	barFigureText,
	barKindWords,
	barValueText,
	unitHeading,
} from "../lib/bar-words"
import { PEAK_COLUMNS } from "../lib/peak-words"
import type { PlanBar, PlanUnit } from "../lib/plan-bars"
import { PLAN_UNITS } from "../lib/plan-unit"
import type { PeakWindowKey } from "../lib/types"
import PlanMark from "./PlanMark.svelte"

let {
	bars,
	selected,
	unit,
	onWindow,
	onUnit,
}: {
	bars: PlanBar[]
	selected: PeakWindowKey
	unit: PlanUnit
	onWindow: (key: PeakWindowKey) => void
	onUnit: (key: PlanUnit) => void
} = $props()

const chart = $derived(barGeometry(bars))
const label = $derived(barAriaLabel(bars, selected))
</script>

<div class="plan-bars">
	<div class="bars-controls">
		<div class="window-tabs" role="group" aria-label="Window">
			{#each PEAK_COLUMNS as column (column.key)}
				<button
					class="window-tab"
					type="button"
					aria-pressed={selected === column.key}
					onclick={() => onWindow(column.key)}
				>
					{column.label}
				</button>
			{/each}
		</div>
		<div class="window-tabs" role="group" aria-label="Unit">
			{#each PLAN_UNITS as choice (choice.unit)}
				<button
					class="window-tab"
					type="button"
					aria-pressed={unit === choice.unit}
					onclick={() => onUnit(choice.unit)}
				>
					{choice.label}
				</button>
			{/each}
		</div>
	</div>

	{#if chart !== null}
		<figure class="bars-figure">
			<svg
				class="bars-svg"
				viewBox={`0 0 ${chart.width} ${chart.height}`}
				role="img"
				aria-label={label}
			>
				<defs>
					<pattern
						id="plan-bar-hatch"
						width="7"
						height="7"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<rect width="7" height="7" fill="var(--ds-color-secondary)"></rect>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="7"
							stroke="var(--ds-color-muted-foreground)"
							stroke-width="2"
						></line>
					</pattern>
				</defs>
				{#each chart.yTicks as tick}
					<line
						class="bars-grid"
						x1="56"
						x2={chart.width - 16}
						y1={tick.y}
						y2={tick.y}
					></line>
					<text class="bars-axis" x="48" y={tick.y} text-anchor="end" dominant-baseline="middle">
						{tick.label}
					</text>
				{/each}
				{#each chart.bars as mark (mark.bar.plan)}
					{#if mark.bar.kind === "estimate" && mark.lowY !== null}
						<g class="bars-whisker">
							<line
								x1={mark.center}
								x2={mark.center}
								y1={mark.openHigh ? mark.openY : (mark.highY ?? mark.y)}
								y2={mark.lowY}
							></line>
							{#if mark.highY !== null}
								<line
									x1={mark.center - 6}
									x2={mark.center + 6}
									y1={mark.highY}
									y2={mark.highY}
								></line>
							{:else}
								<polygon
									points={`${mark.center},${mark.openY} ${mark.center - 5},${mark.openY + 9} ${mark.center + 5},${mark.openY + 9}`}
								></polygon>
							{/if}
							<line
								x1={mark.center - 6}
								x2={mark.center + 6}
								y1={mark.lowY}
								y2={mark.lowY}
							></line>
						</g>
					{/if}
					{#if mark.bar.kind === "collecting"}
						<rect
							class="bars-stub"
							x={mark.x}
							y={mark.base - 6}
							width={mark.width}
							height="6"
						></rect>
					{:else if mark.bar.kind !== "none"}
						<rect
							class="bars-fill"
							class:bars-fill-rough={mark.bar.rough}
							class:bars-fill-fallback={mark.bar.kind === "fallback"}
							x={mark.x}
							y={mark.y}
							width={mark.width}
							height={mark.height}
						></rect>
					{/if}
					{@const openSide = mark.center < chart.width / 2 ? "start" : "end"}
					{@const labelX = mark.openHigh
						? openSide === "start"
							? mark.x + mark.width + 4
							: mark.x - 4
						: mark.center}
					<text
						class="bars-value"
						x={labelX}
						y={mark.valueY}
						text-anchor={mark.openHigh ? openSide : "middle"}
					>
						{#if mark.bar.kind === "estimate"}≈ {barFigureText(mark.bar)}{:else if mark.bar.kind === "fallback"}{barFigureText(
								mark.bar,
							)}{:else if mark.bar.kind === "collecting"}<tspan x={labelX}
								>{mark.bar.collecting?.seen} of {mark.bar.collecting?.of}</tspan
							><tspan x={labelX} dy="1.1em">days</tspan>{:else}–{/if}
					</text>
					{#if mark.bar.rough}
						<text
							class="bars-meta"
							x={labelX}
							y={Math.max(10, mark.valueY - 12)}
							text-anchor={mark.openHigh ? openSide : "middle"}>rough</text
						>
					{/if}
				{/each}
			</svg>
			<div class="bars-labels" style={`--bar-count: ${chart.bars.length}`}>
				{#each chart.bars as mark (mark.bar.plan)}
					<div class="bars-label">
						<PlanMark plan={mark.bar.plan} name={mark.bar.planName} size={20} />
						<span class="bars-name">{mark.bar.planName}</span>
						{#if mark.bar.tier !== null}<span class="bars-tier">{mark.bar.tier}</span>{/if}
						{#if mark.bar.kind === "fallback"}
							<span class="bars-note">most we used</span>
						{/if}
					</div>
				{/each}
			</div>
			<div class="visually-hidden">
				<table>
					<caption>{label}</caption>
					<thead>
						<tr>
							<th scope="col">Plan</th>
							<th scope="col">Tier</th>
							<th scope="col">{unitHeading(unit)}</th>
							<th scope="col">How</th>
						</tr>
					</thead>
					<tbody>
						{#each bars as bar (bar.plan)}
							<tr>
								<th scope="row">{bar.planName}</th>
								<td>{bar.tier ?? "–"}</td>
								<td>
									{bar.tokens === null
										? bar.collecting === null
											? "–"
											: `${bar.collecting.seen} of ${bar.collecting.of} days`
										: barValueText(bar)}
								</td>
								<td>{barKindWords(bar)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</figure>
	{:else}
		<p class="section-empty">No plan has a figure for this window yet.</p>
	{/if}
</div>
