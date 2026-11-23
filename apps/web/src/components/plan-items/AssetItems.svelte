<script lang="ts">
import type { AccountCard } from "../../lib/view/plan-items/accounts"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import type { LoanCard } from "../../lib/view/plan-items/loans"
import type { MarkMap } from "../../lib/view/what-if/items"
import EmptyState from "../ui/EmptyState.svelte"
import AccountCards from "./AccountCards.svelte"
import LoanCards from "./LoanCards.svelte"
import ReadOnlyLoans from "./ReadOnlyLoans.svelte"

interface Props {
	accounts: readonly AccountCard[]
	/** What the What-if session changes in each Account card, by id. */
	marks?: MarkMap
	loans: readonly LoanCardView[]
	/** The loan Flows no loan card places, which are shown read-only. */
	other: readonly LoanCard[]
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switches name both. */
	plan: string
	contentHash: string
	/** Opens the planner's drawer on an item, in the form it names. */
	open: (drawer: PlanDrawer) => void
}

let {
	accounts,
	marks = {},
	loans,
	other,
	currency,
	editable,
	plan,
	contentHash,
	open,
}: Props = $props()
</script>

{#if accounts.length === 0}
	{#if loans.length === 0}<EmptyState title="No accounts in this plan" />{/if}
{:else}
	<AccountCards
		cards={accounts}
		{marks}
		{currency}
		{editable}
		{plan}
		{contentHash}
		onEdit={(id) => open({ id })}
		onTry={(id) => open({ id, tryValue: true })}
	/>
{/if}
{#if loans.length > 0}
	<LoanCards
		cards={loans}
		{currency}
		{editable}
		{plan}
		{contentHash}
		onEdit={(id) => open({ id, loan: true })}
		onPay={(id) => open({ id, extra: true })}
		onTry={(id) => open({ id, loan: true, tryValue: true })}
	/>
{/if}
{#if other.length > 0}
	<ReadOnlyLoans cards={other} {currency} />
{/if}
