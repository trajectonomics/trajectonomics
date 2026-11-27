<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import { type PlanDrawer, tryDrawer } from "../../lib/view/plan-items/drawer"
import type { FlowCard } from "../../lib/view/plan-items/flows"
import type { PlanKind } from "../../lib/view/plan-items/kinds"
import type { LoanPage } from "../../lib/view/what-if/loan-items"
import type { ItemsView } from "../../lib/view/what-if/plan-changes"
import AccountCards from "./AccountCards.svelte"
import AssetCards from "./AssetCards.svelte"
import FlowCards from "./FlowCards.svelte"
import LoanCards from "./LoanCards.svelte"

interface Props {
	kind: PlanKind
	/** What the drawer is open on: the item's id, and whether it is a loan or a home or car. */
	drawer: PlanDrawer
	/** The page's cards, each with what the What-if session changes in it. */
	lists: {
		readonly flows: ItemsView<FlowCard>
		readonly accounts: ItemsView<AccountCard>
		readonly assets: readonly AssetCardView[]
		readonly loans: LoanPage
	}
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switches name both. */
	plan: string
	contentHash: string
	/** Opens the What-if form of the item the face states, in the form the face shows. */
	onTry: (drawer: PlanDrawer) => void
	/** Opens the extra-payment form of the loan the face states. */
	onPay: (id: string) => void
}

/**
 * The full card of the one item the drawer is open on, drawn by the page's own card so every fact, the
 * What-if switch and a loan's schedule are what the full page shows. Its Edit control is left out: the form
 * is right below it, while "Pay extra" stays, because the payment has a form of its own.
 */
let { kind, drawer, lists, currency, editable, plan, contentHash, onTry, onPay }: Props = $props()
const id = $derived(drawer.id ?? "")
/** The one card the drawer is open on. */
function one<T extends { readonly id: string }>(cards: readonly T[]): T[] {
	return cards.filter((card) => card.id === id)
}
/** The What-if form of the one item, in the same form the face states: a loan's terms, a home or car's values, or an Account's. */
function tryOne(cardId: string): void {
	onTry(tryDrawer(drawer, cardId))
}
const none = () => undefined
</script>

{#if id !== ""}
	<div class="[&_ul]:grid-cols-1">
		{#if kind === "assets"}
			{#if drawer.asset === true}
				<AssetCards cards={one(lists.assets)} {currency} {editable} actions={false} heading={false} {plan} {contentHash} onEdit={none} onTry={tryOne} />
			{:else if drawer.loan === true}
				<LoanCards cards={one(lists.loans.cards)} marks={lists.loans.marks} {currency} {editable} actions={false} heading={false} {plan} {contentHash} onEdit={none} onPay={onPay} onTry={tryOne} />
			{:else}
				<AccountCards cards={one(lists.accounts.cards)} marks={lists.accounts.marks} {currency} {editable} actions={false} {plan} {contentHash} onEdit={none} onTry={tryOne} />
			{/if}
		{:else}
			<FlowCards cards={one(lists.flows.cards)} marks={lists.flows.marks} {currency} {editable} actions={false} {plan} {contentHash} onEdit={none} onTry={tryOne} />
		{/if}
	</div>
{/if}
