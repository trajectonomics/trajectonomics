<script lang="ts">
import type { Snippet } from "svelte"
import { cx } from "./cx"

interface Props {
	/** What the figure is, such as "Net worth". */
	label: string
	/** The figure itself: a Money, or a formatted date. */
	value: Snippet
	/** A line under the figure, such as its As-of date. */
	secondary?: string
	/** Classes for the figure's line, such as a smaller size on a phone. */
	valueClassName?: string
	/** Classes for the line under the figure, such as hiding it on a phone. */
	secondaryClassName?: string
}

let { label, value, secondary, valueClassName = "text-2xl", secondaryClassName }: Props = $props()
</script>

<div>
	<p class="text-sm text-muted-foreground">{label}</p>
	<p class={cx("mt-1 font-semibold tracking-tight tabular-nums", valueClassName)}>{@render value()}</p>
	{#if secondary}
		<p class={cx("mt-1 text-sm text-muted-foreground", secondaryClassName)}>{secondary}</p>
	{/if}
</div>
