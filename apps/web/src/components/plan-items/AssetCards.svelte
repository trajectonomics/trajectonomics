<script lang="ts">
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import AssetCard from "./AssetCard.svelte"
import CompactAdd from "./CompactAdd.svelte"
import CompactItem from "./CompactItem.svelte"

interface Props {
	cards: readonly AssetCardView[]
	currency: string
	editable: boolean
	/** False on the drawer's face, which shows no Edit control: the form is right below it. */
	actions?: boolean
	/** False on the drawer's face, which repeats the asset's name and needs no section heading. */
	heading?: boolean
	/** How the cards are drawn: the page's full card, or the Plan's compact one. */
	density?: PlanDensity
	/** The words of the dashed card that adds one; absent when the list draws none. */
	addNoun?: string | undefined
	onAdd?: (() => void) | undefined
	plan: string
	contentHash: string
	onEdit: (id: string) => void
	onTry: (id: string) => void
}

/** The plan's homes and cars: full cards, or the Plan's compact grid that opens each one in the drawer. */
let {
	cards,
	currency,
	editable,
	actions = true,
	heading = true,
	density = "full",
	addNoun,
	onAdd,
	plan,
	contentHash,
	onEdit,
	onTry,
}: Props = $props()
</script>

<section class="min-w-0 space-y-3" aria-label="Homes and cars">
	{#if heading}<h2 class="font-semibold">Homes and cars</h2>{/if}
	{#if density === "compact"}
		<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
			{#each cards as card (card.id)}
				<CompactItem
					kind="account"
					id={card.id}
					amount={card.baselineValue}
					line="Home or car"
					{currency}
					onOpen={() => onEdit(card.id)}
				/>
			{/each}
			{#if addNoun !== undefined}
				<CompactAdd noun={addNoun} {editable} onOpen={() => onAdd?.()} />
			{/if}
		</ul>
	{:else}
		<ul class="grid min-w-0 gap-3 sm:grid-cols-2">
			{#each cards as card (card.id)}
				<AssetCard {card} {currency} {editable} {actions} {plan} {contentHash} onEdit={() => onEdit(card.id)} onTry={() => onTry(card.id)} />
			{/each}
		</ul>
	{/if}
</section>
