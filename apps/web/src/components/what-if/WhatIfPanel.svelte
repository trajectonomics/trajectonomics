<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** The plan the what-if is on. */
	plan: string
	/** What the panel shows, one sentence under its heading. */
	intro: string
	children: Snippet
}

/** The frame of a what-if on a figure page: its heading, and the words that say which figure is which. */
let { plan, intro, children }: Props = $props()
const uid = $props.id()
</script>

<section aria-labelledby="{uid}-title" class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
	<header>
		<h2 id="{uid}-title" class="text-base font-semibold">What-if on {plan}</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			{intro} The what-if value is the main figure, with the baseline under it and the change the CLI states.
		</p>
	</header>
	{@render children()}
</section>
