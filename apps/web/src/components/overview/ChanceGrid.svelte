<script lang="ts">
import type { FocusCounts } from "../../lib/view/overview/focus"
import { cx } from "../ui/cx"

interface Props {
	counts: FocusCounts
	/**
	 * "sm" is the card's row of hairline squares, with the counts beside it. "lg" is the focus point's picture:
	 * fewer columns of bigger squares, so the same paths fill a chart-sized box on a phone and a desktop. The
	 * page writes the percent beside it and the counts in its heading.
	 */
	size?: "sm" | "lg"
}

/** The markets the answer held on: one square each, the first ones filled. The heading says the counts. */
let { counts, size = "sm" }: Props = $props()
const squares = $derived(Array.from({ length: counts.paths }, (_, index) => index))
</script>

<div aria-hidden="true" class="flex max-w-full min-w-0 flex-wrap items-center gap-3">
	<div
		class={cx(
			"grid max-w-full gap-px",
			size === "lg" ? "w-full grid-cols-[repeat(25,minmax(0,1fr))]" : "grid-cols-[repeat(50,minmax(0,4px))]",
		)}
	>
		{#each squares as index (index)}
			<span
				class={cx(
					size === "lg" ? "aspect-square w-full" : "size-1",
					index < counts.succeeded
						? "bg-accent print:bg-foreground/20"
						: "border border-muted-foreground/40",
				)}
			></span>
		{/each}
	</div>
	{#if size === "sm"}
		<p class="whitespace-nowrap tabular-nums">
			<span class="text-xl font-semibold">{counts.succeeded}</span><span
				class="text-xs text-muted-foreground">/{counts.paths}</span
			>
		</p>
	{/if}
</div>
