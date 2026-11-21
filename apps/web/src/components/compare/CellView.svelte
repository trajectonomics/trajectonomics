<script lang="ts">
import type { Cell } from "../../lib/view/compare"
import Money from "../ui/Money.svelte"

interface Props {
	cell: Cell
}

/** A figure cell: a money string or a word, with its note on a line under it. */
let { cell }: Props = $props()
const value = $derived(cell.value)
</script>

<span class="block">
	{#if value.kind === "money"}
		<Money amount={value.amount} />
	{:else}
		<span>{value.text}</span>
	{/if}
	{#if cell.note}
		<span class="mt-0.5 block text-xs text-muted-foreground">{cell.note}</span>
	{/if}
</span>
