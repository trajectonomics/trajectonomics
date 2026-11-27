<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { chartAriaLabel, chartGeometry } from "../lib/chart"
import { chartReadout, dayAt, keyDay } from "../lib/chart-pointer"
import { compactCount, displayCount } from "../lib/format"
import { planColour } from "../lib/plan-colour"
import { type MarkerShape, seriesCue } from "../lib/series-style"
import type { ChartSeries } from "../lib/types"

let { series, from, to }: { series: ChartSeries[]; from: string; to: string } = $props()

const chart = $derived(chartGeometry(series))
const label = $derived(chartAriaLabel(series, from, to))
const days = $derived(series[0]?.points ?? [])
let pinned = $state<string | null>(null)
let hot = $state<string | null>(null)
let dayIndex = $state<number | null>(null)
const chosen = $derived(pinned ?? hot)
const readout = $derived(
	chart === null || dayIndex === null ? null : chartReadout(chart.lines, dayIndex),
)
const guideX = $derived(
	chart === null || dayIndex === null ? null : (chart.lines[0]?.points[dayIndex]?.x ?? null),
)

function lit(plan: string): boolean {
	return chosen === null || chosen === plan
}

function track(event: PointerEvent) {
	const svg = event.currentTarget
	if (!(svg instanceof SVGSVGElement)) return
	const bounds = svg.getBoundingClientRect()
	const view = svg.viewBox.baseVal.width
	if (bounds.width === 0 || view === 0) return
	dayIndex = dayAt(((event.clientX - bounds.left) / bounds.width) * view, days.length)
}

function endTrack(event: PointerEvent) {
	if (event.pointerType === "touch") return
	dayIndex = null
}

function onKey(event: KeyboardEvent) {
	if (event.key === "Escape") {
		pinned = null
		dayIndex = null
		return
	}
	const next = keyDay(event.key, dayIndex, days.length)
	if (next === null) return
	event.preventDefault()
	dayIndex = next
}

function pin(plan: string) {
	pinned = pinned === plan ? null : plan
}
</script>

{#snippet marker(shape: MarkerShape, size: number)}
	{#if shape === "circle"}
		<circle cx="0" cy="0" r={size} fill="currentColor" />
	{:else if shape === "square"}
		<rect x={-size} y={-size} width={size * 2} height={size * 2} fill="currentColor" />
	{:else if shape === "triangle"}
		<polygon points={`0,${-size} ${size},${size} ${-size},${size}`} fill="currentColor" />
	{:else}
		<polygon points={`0,${-size} ${size},0 0,${size} ${-size},0`} fill="currentColor" />
	{/if}
{/snippet}

{#if chart !== null}
	<figure class="chart-figure">
		<svg
			class="chart-svg"
			class:is-choosing={chosen !== null}
			viewBox={`0 0 ${chart.width} ${chart.height}`}
			role="slider"
			aria-label={label}
			aria-orientation="horizontal"
			aria-valuemin={0}
			aria-valuemax={Math.max(0, days.length - 1)}
			aria-valuenow={dayIndex ?? 0}
			aria-valuetext={readout ?? label}
			tabindex="0"
			onpointerdown={track}
			onpointermove={track}
			onpointerleave={endTrack}
			onkeydown={onKey}
		>
			{#each chart.yTicks as tick}
				<line class="chart-grid" x1="64" x2={chart.width - 16} y1={tick.y} y2={tick.y} />
				<text class="chart-axis" x="56" y={tick.y} text-anchor="end" dominant-baseline="middle">
					{compactCount(tick.value)}
				</text>
			{/each}
			{#each chart.xTicks as tick, index}
				<text
					class="chart-axis"
					x={tick.x}
					y={chart.height - 10}
					text-anchor={chart.xTicks.length === 1
						? "middle"
						: index === 0
							? "start"
							: index === chart.xTicks.length - 1
								? "end"
								: "middle"}
				>
					{tick.day}
				</text>
			{/each}
			{#if guideX !== null}
				<line class="chart-guide" x1={guideX} x2={guideX} y1="16" y2={chart.height - 32} />
			{/if}
			{#each chart.lines as line, index}
				{@const cue = seriesCue(index)}
				{@const probe = dayIndex === null ? null : (line.points[dayIndex] ?? null)}
				<g
					class="chart-line"
					class:chart-line-on={lit(line.plan)}
					style={`color: ${planColour(line.plan)}`}
				>
					<polyline
						points={line.points.map((point) => `${point.x},${point.y}`).join(" ")}
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-dasharray={cue.dash ?? undefined}
						vector-effect="non-scaling-stroke"
					/>
					{#each line.points.slice(-1) as point}
						<g transform={`translate(${point.x} ${point.y})`}>
							{@render marker(cue.shape, 3.2)}
						</g>
					{/each}
					{#if probe !== null}
						<g transform={`translate(${probe.x} ${probe.y})`}>
							{@render marker(cue.shape, 4)}
						</g>
					{/if}
				</g>
			{/each}
		</svg>
		{#if readout !== null}
			<p class="chart-readout">{readout}</p>
		{/if}
		<ul class="chart-legend">
			{#each chart.lines as line, index}
				{@const cue = seriesCue(index)}
				<li>
					<button
						class="legend-button"
						type="button"
						aria-pressed={pinned === line.plan}
						onclick={() => pin(line.plan)}
						onpointerenter={() => (hot = line.plan)}
						onpointerleave={() => (hot = null)}
						onfocus={() => (hot = line.plan)}
						onblur={() => (hot = null)}
					>
						<svg class="legend-mark" viewBox="0 0 40 12" aria-hidden="true">
							<g style={`color: ${planColour(line.plan)}`}>
								<line
									x1="0"
									y1="6"
									x2="26"
									y2="6"
									stroke="currentColor"
									stroke-width="2"
									stroke-dasharray={cue.dash ?? undefined}
									vector-effect="non-scaling-stroke"
								/>
								<g transform="translate(32 6)">
									{@render marker(cue.shape, 2.8)}
								</g>
							</g>
						</svg>
						<span>{line.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<div class="visually-hidden">
			<table>
				<caption>{label}</caption>
				<thead>
					<tr>
						<th scope="col">Day</th>
						{#each series as line}<th scope="col">{line.name}</th>{/each}
					</tr>
				</thead>
				<tbody>
					{#each days as day, index}
						<tr>
							<th scope="row">{day.day}</th>
							{#each series as line}
								<td>{displayCount(line.points[index]?.tokens ?? 0)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<figcaption class="chart-caption">
			Total tokens per UTC day, {from} to {to} ({days.length} {days.length === 1 ? "day" : "days"}).
		</figcaption>
	</figure>
{/if}
