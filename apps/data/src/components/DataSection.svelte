<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import type { Snippet } from "svelte"

let {
	id,
	title,
	href,
	direction,
	takeaway,
	chart,
	notes,
}: {
	id: string
	title: string
	href: string
	direction: string
	takeaway: string
	chart: Snippet
	notes: Snippet
} = $props()
</script>

<section class="data-section" id={id} aria-labelledby={`${id}-title`}>
	<h2 id={`${id}-title`} class="section-heading"><a href={href}>{title}</a></h2>
	<p class="section-direction">{direction}</p>
	<p class="section-takeaway">{takeaway}</p>
	{@render chart()}
	<details class="section-notes">
		<summary>Notes</summary>
		<div class="section-notes-body">{@render notes()}</div>
	</details>
</section>
