<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import type { LoanCard } from "../../lib/view/plan-items/loans"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import type { MarkMap } from "../../lib/view/what-if/items"
import type { LoanMarks } from "../../lib/view/what-if/loan-items"
import EmptyState from "../ui/EmptyState.svelte"
import AccountCards from "./AccountCards.svelte"
import AssetCards from "./AssetCards.svelte"
import LoanCards from "./LoanCards.svelte"
import ReadOnlyLoans from "./ReadOnlyLoans.svelte"

interface Props {
	accounts: readonly AccountCard[]
	marks?: MarkMap
	assets?: readonly AssetCardView[]
	loans: readonly LoanCardView[]
	loanMarks?: Readonly<Record<string, LoanMarks>>
	other: readonly LoanCard[]
	currency: string
	editable: boolean
	actions?: boolean
	density?: PlanDensity
	plan: string
	contentHash: string
	open: (drawer: PlanDrawer) => void
}

let {
	accounts,
	marks = {},
	assets = [],
	loans,
	loanMarks = {},
	other,
	currency,
	editable,
	actions = true,
	density = "full",
	plan,
	contentHash,
	open,
}: Props = $props()
const compact = $derived(density === "compact")
</script>

{#if compact || accounts.length > 0}
	<AccountCards
		cards={accounts}
		{marks}
		{currency}
		{editable}
		{actions}
		{density}
		addNoun={compact ? "account" : undefined}
		onAdd={() => open({})}
		{plan}
		{contentHash}
		onEdit={(id) => open({ id, ...(compact ? { details: true } : {}) })}
		onTry={(id) => open({ id, tryValue: true })}
	/>
{:else if loans.length === 0 && assets.length === 0}
	<EmptyState title="No accounts in this plan" />
{/if}
{#if compact || assets.length > 0}
	<AssetCards
		cards={assets}
		{currency}
		{editable}
		{actions}
		{density}
		addNoun={compact ? "a home or car" : undefined}
		onAdd={() => open({ asset: true })}
		{plan}
		{contentHash}
		onEdit={(id) => open({ id, asset: true, ...(compact ? { details: true } : {}) })}
		onTry={(id) => open({ id, asset: true, tryValue: true })}
	/>
{/if}
{#if compact || loans.length > 0}
	<LoanCards
		cards={loans}
		marks={loanMarks}
		{currency}
		{editable}
		{actions}
		{density}
		addNoun={compact ? "loan" : undefined}
		onAdd={() => open({ loan: true })}
		{plan}
		{contentHash}
		onEdit={(id) => open({ id, loan: true, ...(compact ? { details: true } : {}) })}
		onPay={(id) => open({ id, extra: true })}
		onTry={(id) => open({ id, loan: true, tryValue: true })}
	/>
{/if}
{#if other.length > 0}
	<ReadOnlyLoans cards={other} {currency} />
{/if}
