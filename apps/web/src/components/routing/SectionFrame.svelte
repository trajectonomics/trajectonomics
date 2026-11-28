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
		<details class="text-sm text-muted-foreground">
			<summary class="cursor-pointer hover:text-foreground">How this list works</summary>
			<p>{intro}</p>
		</details>
		<div class="flex gap-2">
			<!-- The list is read top to bottom, so the arrow points down it. -->
			<svg
				viewBox="0 0 10 20"
				aria-hidden="true"
				focusable="false"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-5 w-2.5 shrink-0 text-muted-foreground"
			>
				<path d="M5 1v16" />
				<path d="M1 13l4 4 4-4" />
			</svg>
			<div class="min-w-0 flex-1">{@render children()}</div>
		</div>
	</div>
	<div class="min-w-0 space-y-2">
		<h3 class="text-sm font-medium">What it did over the plan</h3>
		{@render figure()}
	</div>
</section>
