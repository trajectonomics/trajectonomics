<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** A short heading, such as "No transactions in this period". */
	title: string
	children?: Snippet
}

let { title, children }: Props = $props()
</script>

<section class="rounded-lg border border-dashed border-border p-6">
	<h2 class="text-base font-semibold">{title}</h2>
	{#if children}
		<div class="mt-2 text-sm text-muted-foreground">{@render children()}</div>
	{/if}
</section>
