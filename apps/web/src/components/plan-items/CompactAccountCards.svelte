<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import CompactAdd from "./CompactAdd.svelte"
import CompactItem from "./CompactItem.svelte"

interface Props {
	cards: readonly AccountCard[]
	currency: string
	editable: boolean
	/** The words of the dashed card that adds one; absent when the list draws none. */
	addNoun?: string | undefined
	onAdd?: (() => void) | undefined
	onOpen: (id: string) => void
}

/** The Plan's compact grid of Accounts: one small button per Account, and the dashed card that adds one. */
let { cards, currency, editable, addNoun, onAdd, onOpen }: Props = $props()
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
	{#each cards as card (card.id)}
		<CompactItem
			kind="account"
			id={card.id}
			amount={card.balance}
			line={card.kind === "asset" ? "Asset" : "Debt"}
			{currency}
			onOpen={() => onOpen(card.id)}
		/>
	{/each}
	{#if addNoun !== undefined}
		<CompactAdd noun={addNoun} {editable} onOpen={() => onAdd?.()} />
	{/if}
</ul>
