<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { chartAriaLabel, chartGeometry } from "../lib/chart"
import { compactCount, displayCount } from "../lib/format"
import { type MarkerShape, seriesCue } from "../lib/series-style"
import type { ChartSeries } from "../lib/types"

let { series, from, to }: { series: ChartSeries[]; from: string; to: string } = $props()

const chart = $derived(chartGeometry(series))
const label = $derived(chartAriaLabel(series, from, to))
const days = $derived(series[0]?.points ?? [])
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
			viewBox={`0 0 ${chart.width} ${chart.height}`}
			role="img"
			aria-label={label}
		>
			{#each chart.yTicks as tick}
				<line
					class="chart-grid"
					x1="64"
					x2={chart.width - 16}
					y1={tick.y}
					y2={tick.y}
				/>
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
			{#each chart.lines as line, index}
				{@const cue = seriesCue(index)}
				<g style={`color: ${cue.colour}`}>
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
				</g>
			{/each}
		</svg>
		<ul class="chart-legend">
			{#each series as line, index}
				{@const cue = seriesCue(index)}
				<li>
					<svg class="legend-mark" viewBox="0 0 40 12" aria-hidden="true">
						<g style={`color: ${cue.colour}`}>
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
