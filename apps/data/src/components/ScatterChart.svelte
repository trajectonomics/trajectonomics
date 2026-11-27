<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { planLogo } from "../lib/plan-logos"
import { type ScatterPoint, scatterAriaLabel, scatterGeometry } from "../lib/scatter"
import { type TickKind, tickText } from "../lib/tick-label"

let {
	points,
	xTitle,
	yTitle,
	xKind,
	yKind,
	caption,
	xDomain,
}: {
	points: ScatterPoint[]
	xTitle: string
	yTitle: string
	xKind: TickKind
	yKind: TickKind
	caption: string
	xDomain?: readonly [number, number]
} = $props()

const chart = $derived(scatterGeometry(points, xDomain))
const label = $derived(scatterAriaLabel(points, xTitle, yTitle))
</script>

{#if chart !== null}
	<figure class="scatter-figure">
		<svg
			class="scatter-svg"
			viewBox={`0 0 ${chart.width} ${chart.height}`}
			role="img"
			aria-label={label}
		>
			<rect
				class="scatter-best"
				x={chart.best.x}
				y={chart.best.y}
				width={chart.best.width}
				height={chart.best.height}
			></rect>
			{#if chart.best.width > 90 && chart.best.height > 40}
				<text
					class="scatter-best-label"
					x={chart.best.x + chart.best.width - 10}
					y={chart.best.y + 20}
					text-anchor="end">Best value</text
				>
			{/if}
			{#each chart.yAxis.ticks as tick}
				{@const y = chart.plot.bottom - tick.share * (chart.plot.bottom - chart.plot.top)}
				<line
					class="scatter-grid"
					x1={chart.plot.left}
					x2={chart.plot.right}
					y1={y}
					y2={y}
				></line>
				<text
					class="scatter-axis"
					x={chart.plot.left - 10}
					y={y}
					text-anchor="end"
					dominant-baseline="middle">{tickText(yKind, tick.value)}</text
				>
			{/each}
			{#each chart.xAxis.ticks as tick}
				{@const x = chart.plot.left + tick.share * (chart.plot.right - chart.plot.left)}
				<line
					class="scatter-grid"
					x1={x}
					x2={x}
					y1={chart.plot.top}
					y2={chart.plot.bottom}
				></line>
				<text class="scatter-axis" x={x} y={chart.plot.bottom + 24} text-anchor="middle">
					{tickText(xKind, tick.value)}
				</text>
			{/each}
			<text class="scatter-title" x={chart.plot.left} y={chart.plot.top - 10}>{yTitle}</text>
			<text
				class="scatter-title"
				x={(chart.plot.left + chart.plot.right) / 2}
				y={chart.height - 6}
				text-anchor="middle">{xTitle}</text
			>
			{#each chart.dots as dot, index (dot.key)}
				{@const logo = planLogo(dot.key)}
				{@const anchor = dot.cx > chart.width * 0.72 ? "end" : "start"}
				<g class="scatter-mark">
					<title>{`${dot.label}: ${tickText(yKind, dot.y)} ${yTitle}, ${tickText(xKind, dot.x)} ${xTitle}`}</title>
					<circle
						class="scatter-dot"
						class:scatter-dot-open={dot.hollow}
						cx={dot.cx}
						cy={dot.cy}
						r="9"
					></circle>
					{#if logo !== null}
						<g
							class="scatter-logo"
							class:scatter-logo-open={dot.hollow}
							transform={`translate(${dot.cx - 6} ${dot.cy - 6}) scale(0.5)`}
						>
							<path d={logo.path}></path>
						</g>
					{:else}
						<text class="scatter-initial" x={dot.cx} y={dot.cy + 4} text-anchor="middle">
							{dot.label.slice(0, 1)}
						</text>
					{/if}
					<text
						class="scatter-label"
						x={dot.cx + (anchor === "end" ? -14 : 14)}
						y={dot.cy + (index % 2 === 0 ? 4 : 17)}
						text-anchor={anchor}>{dot.label}</text
					>
				</g>
			{/each}
		</svg>
		<div class="visually-hidden">
			<table>
				<caption>{label}</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col">{xTitle}</th>
						<th scope="col">{yTitle}</th>
					</tr>
				</thead>
				<tbody>
					{#each points as point (point.key)}
						<tr>
							<th scope="row">{point.label}</th>
							<td>{tickText(xKind, point.x)}</td>
							<td>{tickText(yKind, point.y)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<figcaption class="scatter-caption">{caption}</figcaption>
	</figure>
{/if}
