<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	id: string
	title: string
	/** One sentence on what the section means. */
	intro: string
	/** The rows and their controls. */
	children: Snippet
	/** What the section did over the plan. */
	figure: Snippet
}

let { id, title, intro, children, figure }: Props = $props()
</script>

<!-- One section: its rows on the left, and beside them what it did over the plan; they stack on a phone. -->
<section aria-labelledby={id} class="grid gap-6 border-b border-border pb-8 lg:grid-cols-2">
	<div class="min-w-0 space-y-3">
		<h2 {id} class="text-base font-semibold">{title}</h2>
		<p class="text-sm text-muted-foreground">{intro}</p>
		{@render children()}
	</div>
	<div class="min-w-0 space-y-2">
		<h3 class="text-sm font-medium">What it did over the plan</h3>
		{@render figure()}
	</div>
</section>
