<script lang="ts">
import { formatMonth } from "../../lib/format"
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import { type LoanMarks, NO_LOAN_MARKS } from "../../lib/view/what-if/loan-items"
import CompactAdd from "./CompactAdd.svelte"
import CompactItem from "./CompactItem.svelte"
import LoanCard from "./LoanCard.svelte"

interface Props {
	cards: readonly LoanCardView[]
	/** What the What-if session changes in each loan card, by loan id. */
	marks?: Readonly<Record<string, LoanMarks>>
	currency: string
	editable: boolean
	/** False on the drawer's face, which shows no Edit control: the form is right below it. */
	actions?: boolean
	/** Whether "Pay extra" shows: the drawer's face keeps it, because the payment is its own form. */
	pay?: boolean
	/** False on the drawer's face, which repeats the loan's name and needs no section heading. */
	heading?: boolean
	/** How the cards are drawn: the page's full card, or the Plan's compact one. */
	density?: PlanDensity
	/** The words of the dashed card that adds one; absent when the list draws none. */
	addNoun?: string | undefined
	onAdd?: (() => void) | undefined
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onEdit: (id: string) => void
	onPay: (id: string) => void
	onTry: (id: string) => void
}

/** The plan's loans: full cards with their schedules, or the Plan's compact grid. */
let {
	cards,
	marks = {},
	currency,
	editable,
	actions = true,
	pay = true,
	heading = true,
	density = "full",
	addNoun,
	onAdd,
	plan,
	contentHash,
	onEdit,
	onPay,
	onTry,
}: Props = $props()
</script>

<section class="min-w-0 space-y-3" aria-label="Loans">
	{#if heading}<h2 class="font-semibold">Loans</h2>{/if}
	{#if density === "compact"}
		<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
			{#each cards as card (card.id)}
				<CompactItem
					kind="account"
					id={card.id}
					amount={card.balance}
					line={card.statement.paidOff === null ? "" : `paid off ${formatMonth(card.statement.paidOff)}`}
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
				<LoanCard
					{card}
					marks={marks[card.id] ?? NO_LOAN_MARKS}
					{currency}
					{editable}
					{actions}
					{pay}
					{plan}
					{contentHash}
					onEdit={() => onEdit(card.id)}
					onPay={() => onPay(card.id)}
					onTry={() => onTry(card.id)}
				/>
			{/each}
		</ul>
	{/if}
</section>
