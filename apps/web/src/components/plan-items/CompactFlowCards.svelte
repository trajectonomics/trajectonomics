<script lang="ts">
import type { FlowCard } from "../../lib/view/plan-items/flows"
import CompactAdd from "./CompactAdd.svelte"
import CompactItem from "./CompactItem.svelte"

interface Props {
	cards: readonly FlowCard[]
	currency: string
	editable: boolean
	/** The words of the dashed card that adds one; absent when the list draws none. */
	addNoun?: string | undefined
	onAdd?: (() => void) | undefined
	onOpen: (id: string) => void
}

/** The Plan's compact grid of Flows: one small button per Flow, and the dashed card that adds one. */
let { cards, currency, editable, addNoun, onAdd, onOpen }: Props = $props()
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
	{#each cards as card (card.id)}
		<CompactItem
			kind="flow"
			id={card.id}
			amount={card.amount}
			text={card.amount === null ? (card.ruleShare ?? "computed") : null}
			line={card.compactLine}
			{currency}
			onOpen={() => onOpen(card.id)}
		/>
	{/each}
	{#if addNoun !== undefined}
		<CompactAdd noun={addNoun} {editable} onOpen={() => onAdd?.()} />
	{/if}
</ul>
