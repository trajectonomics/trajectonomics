<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import {
	COLLECTORS_BAR_HEIGHT,
	COLLECTORS_BAR_LEFT,
	COLLECTORS_BAR_RIGHT,
	COLLECTORS_BAR_Y,
	COLLECTORS_ROW_HEIGHT,
	COLLECTORS_TOP,
	type CollectorsGeometry,
	collectorsAriaLabel,
} from "../lib/collectors"

let { geometry }: { geometry: CollectorsGeometry } = $props()

const label = $derived(collectorsAriaLabel(geometry.bars))
</script>

<figure class="collectors-figure">
	<svg
		class="collectors-svg"
		viewBox={`0 0 ${geometry.width} ${geometry.height}`}
		role="img"
		aria-label={label}
	>
		<title>{label}</title>
		{#each geometry.bars as bar, index (bar.machine)}
			{@const top = COLLECTORS_TOP + index * COLLECTORS_ROW_HEIGHT}
			{@const end = bar.x + bar.width}
			<g>
				<title>{`${bar.machine}: ${bar.state}, last send ${bar.ageLabel}`}</title>
				<text class="collectors-machine" x="0" y={top + 22}>{bar.machine}</text>
				<circle
					class={`collectors-dot collectors-dot-${bar.state}`}
					cx={COLLECTORS_BAR_LEFT - 14}
					cy={top + COLLECTORS_BAR_Y + COLLECTORS_BAR_HEIGHT / 2}
					r="4"
				/>
				<rect
					class={`collectors-bar collectors-bar-${bar.state}`}
					x={bar.x}
					y={top + COLLECTORS_BAR_Y}
					width={bar.width}
					height={COLLECTORS_BAR_HEIGHT}
					rx="2"
				/>
				<text class="collectors-age" x={end + 8} y={top + 22}>{bar.ageLabel}</text>
			</g>
		{/each}
		<line
			class="collectors-axis-line"
			x1={COLLECTORS_BAR_LEFT}
			x2={COLLECTORS_BAR_RIGHT}
			y1={geometry.height - 24}
			y2={geometry.height - 24}
		/>
		<text class="collectors-axis" x={COLLECTORS_BAR_LEFT} y={geometry.height - 8}>
			{geometry.from}
		</text>
		<text
			class="collectors-axis"
			x={COLLECTORS_BAR_RIGHT}
			y={geometry.height - 8}
			text-anchor="end">Today</text
		>
	</svg>
	<ul class="visually-hidden">
		{#each geometry.bars as bar (bar.machine)}
			<li>{`${bar.machine}: ${bar.state}, last send ${bar.ageLabel}.`}</li>
		{/each}
	</ul>
</figure>
