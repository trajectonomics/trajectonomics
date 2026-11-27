<script lang="ts">
import type { FocusCounts } from "../../lib/view/overview/focus"

interface Props {
	counts: FocusCounts
}

/** The markets the answer held on: one square each, in rows of 50, the first ones filled. The heading says the counts. */
let { counts }: Props = $props()
const squares = $derived(Array.from({ length: counts.paths }, (_, index) => index))
</script>

<div aria-hidden="true" class="flex items-center gap-3">
	<div class="grid grid-cols-[repeat(50,4px)] gap-px">
		{#each squares as index (index)}
			<span
				class={index < counts.succeeded
					? "size-1 bg-accent print:bg-foreground/20"
					: "size-1 border border-border"}
			></span>
		{/each}
	</div>
	<p class="whitespace-nowrap tabular-nums">
		<span class="text-xl font-semibold">{counts.succeeded}</span><span class="text-xs text-muted-foreground">/{counts.paths}</span>
	</p>
</div>
