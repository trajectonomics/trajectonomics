<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.

import { watchSections } from "../client/section-nav"
import { SECTIONS } from "../client/sections"
import { LOG_PATH } from "../lib/site"

let active = $state(SECTIONS[0]?.id ?? "")

$effect(() =>
	watchSections(
		SECTIONS.map((section) => section.id),
		(id) => {
			active = id
		},
	),
)
</script>

<nav class="data-nav" aria-label="Sections">
	<ul class="data-nav-list">
		{#each SECTIONS as section (section.id)}
			<li>
				<a
					class="data-nav-link"
					href={`#${section.id}`}
					aria-current={active === section.id ? "location" : undefined}
				>
					{section.label}
				</a>
			</li>
		{/each}
		<li class="data-nav-log">
			<a class="data-nav-link" href={LOG_PATH}>Log</a>
		</li>
	</ul>
</nav>
