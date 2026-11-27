<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.

/** The page's first state: its title, and what is being looked up. */
let { title, text }: { title: string; text: string } = $props()
</script>

<div class="panel">
	<h1 class="page-title">{title}</h1>
	<p class="muted" aria-live="polite">{text}</p>
</div>
