<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** What the figure is, such as "Net worth". */
	label: string
	/** The figure itself: a Money, or a formatted date. */
	value: Snippet
	/** A line under the figure, such as its As-of date. */
	secondary?: string
}

let { label, value, secondary }: Props = $props()
</script>

<div>
	<p class="text-sm text-muted-foreground">{label}</p>
	<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{@render value()}</p>
	{#if secondary}
		<p class="mt-1 text-sm text-muted-foreground">{secondary}</p>
	{/if}
</div>
