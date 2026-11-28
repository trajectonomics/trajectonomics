<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { type CollectorsGeometry, collectorsAriaLabel } from "../lib/collectors"

let { geometry }: { geometry: CollectorsGeometry } = $props()

const label = $derived(collectorsAriaLabel(geometry.bars))
</script>

<figure class="collectors-figure">
	<figcaption class="visually-hidden">{label}</figcaption>
	<ol class="collectors-rows">
		{#each geometry.bars as bar (bar.machine)}
			<li class="collectors-row">
				<p class="collectors-line">
					<span class="collectors-machine">
						<span class={`collectors-dot collectors-dot-${bar.state}`} aria-hidden="true"
						></span>
						<span class="collectors-name" title={bar.machine}>{bar.machine}</span>
					</span>
					<span class="collectors-age"
						>{bar.state === "ok" ? bar.ageLabel : `${bar.state} · ${bar.ageLabel}`}</span
					>
				</p>
				<div class="collectors-track" aria-hidden="true">
					<div
						class={`collectors-bar collectors-bar-${bar.state}`}
						style={`left: ${bar.left * 100}%; width: ${bar.width * 100}%`}
					></div>
				</div>
			</li>
		{/each}
	</ol>
	<div class="collectors-axis">
		<p class="collectors-axis-track">
			<span>{geometry.from}</span>
			<span>Today</span>
		</p>
	</div>
</figure>
