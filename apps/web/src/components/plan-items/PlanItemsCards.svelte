<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import type { FlowCard } from "../../lib/view/plan-items/flows"
import type { PlanKind } from "../../lib/view/plan-items/kinds"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import type { LoanPage } from "../../lib/view/what-if/loan-items"
import type { ItemsView } from "../../lib/view/what-if/plan-changes"
import EmptyState from "../ui/EmptyState.svelte"
import AssetItems from "./AssetItems.svelte"
import FlowCards from "./FlowCards.svelte"

interface Props {
	kind: PlanKind
	flows: ItemsView<FlowCard>
	accounts: ItemsView<AccountCard>
	/** The real assets (homes and cars) of the plan, each with its value and its terms. */
	assets: readonly AssetCardView[]
	loans: LoanPage
	currency: string
	editable: boolean
	density: PlanDensity
	/** The plan and the content hash the page read for it: the what-if switches name both. */
	plan: string
	contentHash: string
	/** Opens the drawer on an item: its detail, then its form. */
	open: (drawer: PlanDrawer) => void
	onEdit: (id: string) => void
	onTry: (id: string) => void
	onAdd: () => void
	/** The page's noun for one item, which the dashed card's words name. */
	noun: string
}

/** The cards of one planner page, or of the Plan's tab: full cards, or a compact grid that opens the drawer. */
let {
	kind,
	flows,
	accounts,
	assets,
	loans,
	currency,
	editable,
	density,
	plan,
	contentHash,
	open,
	onEdit,
	onTry,
	onAdd,
	noun,
}: Props = $props()
const compact = $derived(density === "compact")
</script>

{#if kind === "assets"}
	<AssetItems
		accounts={accounts.cards}
		marks={accounts.marks}
		{assets}
		loans={loans.cards}
		loanMarks={loans.marks}
		other={loans.other}
		{currency}
		{editable}
		{density}
		{plan}
		{contentHash}
		{open}
	/>
{:else if !compact && flows.cards.length === 0}
	<EmptyState title="No {noun} in this plan" />
{:else}
	<FlowCards
		cards={flows.cards}
		marks={flows.marks}
		{currency}
		{editable}
		{density}
		addNoun={compact ? noun : undefined}
		onAdd={onAdd}
		onEdit={onEdit}
		{plan}
		{contentHash}
		{onTry}
	/>
{/if}
