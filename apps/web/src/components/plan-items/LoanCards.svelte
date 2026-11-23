<script lang="ts">
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import LoanCard from "./LoanCard.svelte"

interface Props {
	cards: readonly LoanCardView[]
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onEdit: (id: string) => void
	onPay: (id: string) => void
	onTry: (id: string) => void
}

let { cards, currency, editable, plan, contentHash, onEdit, onPay, onTry }: Props = $props()
</script>

<section class="space-y-3" aria-label="Loans">
	<h2 class="font-semibold">Loans</h2>
	<ul class="grid gap-3 sm:grid-cols-2">
		{#each cards as card (card.id)}
			<LoanCard
				{card}
				{currency}
				{editable}
				{plan}
				{contentHash}
				onEdit={() => onEdit(card.id)}
				onPay={() => onPay(card.id)}
				onTry={() => onTry(card.id)}
			/>
		{/each}
	</ul>
</section>
