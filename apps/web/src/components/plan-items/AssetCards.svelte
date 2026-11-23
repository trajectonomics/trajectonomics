<script lang="ts">
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import AssetCard from "./AssetCard.svelte"

interface Props {
	cards: readonly AssetCardView[]
	currency: string
	editable: boolean
	plan: string
	contentHash: string
	onEdit: (id: string) => void
	onTry: (id: string) => void
}

let { cards, currency, editable, plan, contentHash, onEdit, onTry }: Props = $props()
</script>

<section class="min-w-0 space-y-3" aria-label="Homes and cars">
	<h2 class="font-semibold">Homes and cars</h2>
	<ul class="grid min-w-0 gap-3 sm:grid-cols-2">
		{#each cards as card (card.id)}
			<AssetCard {card} {currency} {editable} {plan} {contentHash} onEdit={() => onEdit(card.id)} onTry={() => onTry(card.id)} />
		{/each}
	</ul>
</section>
