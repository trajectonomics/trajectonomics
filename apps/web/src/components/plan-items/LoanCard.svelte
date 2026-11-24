<script lang="ts">
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import { type LoanMarks, NO_LOAN_MARKS } from "../../lib/view/what-if/loan-items"
import Money from "../ui/Money.svelte"
import GroupSwitch from "../what-if/GroupSwitch.svelte"
import WasText from "../what-if/WasText.svelte"
import LoanSchedule from "./LoanSchedule.svelte"

interface Props {
	card: LoanCardView
	/** What the What-if session changes in the card: the baseline's text struck through, or off. */
	marks?: LoanMarks
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onEdit: () => void
	onPay: () => void
	onTry: () => void
}

let {
	card,
	marks = NO_LOAN_MARKS,
	currency,
	editable,
	plan,
	contentHash,
	onEdit,
	onPay,
	onTry,
}: Props = $props()
const statement = $derived(card.statement)
const button =
	"rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<li class="min-w-0 rounded-lg border border-border bg-card p-4 {marks.off ? 'opacity-60' : ''}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h3 class="font-semibold break-all">{card.id}</h3>
		{#if editable}
			<div class="flex shrink-0 flex-wrap gap-2">
				<button type="button" aria-label="Edit loan {card.id}" onclick={onEdit} class={button}>Edit</button>
				<button type="button" aria-label="Pay {card.id} extra" onclick={onPay} class={button}>Pay extra</button>
			</div>
		{/if}
	</div>
	<p class="text-sm text-muted-foreground">Loan</p>
	<p class="mt-2 text-lg"><Money amount={card.principal} {currency} /><WasText was={marks.principal} money {currency} /></p>
	<p class="text-xs text-muted-foreground">Amount borrowed</p>
	<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
		{#each card.rows as row (row.label)}
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd>{row.value}<WasText was={marks.rows[row.label]} /></dd>
		{/each}
		<dt class="text-muted-foreground">Paid in the first payment month</dt>
		<dd>
			{#if statement.payment !== null}
				<Money amount={statement.payment.amount} {currency} />
				{#if statement.payment.withExtra}<span class="text-xs text-muted-foreground">(with an extra payment)</span>{/if}
			{:else}not reported{/if}
		</dd>
	</dl>
	<p class="mt-3 text-sm">
		{#if statement.paidOff !== null}
			Paid off on {statement.paidOff}.
		{:else if statement.owing !== null}
			Owes <Money amount={statement.owing.amount} {currency} /> at {statement.owing.date}.
		{:else}
			No schedule in this Projection.
		{/if}
	</p>
	<details class="mt-3">
		<summary class="cursor-pointer text-sm text-foreground">Schedule</summary>
		<LoanSchedule years={statement.years} {currency} />
	</details>
	{#if editable}
		<p class="mt-3 text-xs text-muted-foreground">
			A What-if tries this loan's terms and switches the loan off with its payments and its withdrawal. It cannot pay extra, and it cannot add or take out the withdrawal that borrows the money.
		</p>
		{#if marks.off || Object.keys(marks.rows).length > 0 || marks.principal !== undefined}
			<p class="mt-1 text-xs text-muted-foreground">The schedule and what the loan owes are the plan's own, not the what-if's.</p>
		{/if}
		<GroupSwitch {plan} {contentHash} group={card.switch} label={card.id} {onTry} />
	{/if}
</li>
