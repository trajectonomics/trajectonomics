<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** The section's id, which names it for a screen reader and anchors a link to it. */
	id: string
	title: string
	/** One or two sentences on what the section shows and how to read its signs. */
	intro?: string
	children: Snippet
}

let { id, title, intro, children }: Props = $props()
</script>

<!-- A titled section of a page: a heading, its intro, and the body of its Reads. -->
<section aria-labelledby={id} class="space-y-4">
	<header>
		<h2 {id} class="text-lg font-semibold tracking-tight">{title}</h2>
		{#if intro}
			<p class="mt-1 max-w-prose text-sm text-muted-foreground">{intro}</p>
		{/if}
	</header>
	{@render children()}
</section>
