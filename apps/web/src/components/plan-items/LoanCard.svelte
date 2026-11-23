<script lang="ts">
import type { LoanCardView } from "../../lib/view/plan-items/loan-card"
import Money from "../ui/Money.svelte"
import ItemSwitch from "../what-if/ItemSwitch.svelte"
import LoanSchedule from "./LoanSchedule.svelte"

interface Props {
	card: LoanCardView
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switch names both. */
	plan: string
	contentHash: string
	onEdit: () => void
	onPay: () => void
	onTry: () => void
}

let { card, currency, editable, plan, contentHash, onEdit, onPay, onTry }: Props = $props()
const statement = $derived(card.statement)
const button =
	"rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<li class="rounded-lg border border-border bg-card p-4">
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
	<p class="mt-2 text-lg"><Money amount={card.principal} {currency} /></p>
	<p class="text-xs text-muted-foreground">Amount borrowed</p>
	<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
		{#each card.rows as row (row.label)}
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd>{row.value}</dd>
		{/each}
		<dt class="text-muted-foreground">Payment</dt>
		<dd>
			{#if statement.payment !== null}<Money amount={statement.payment} {currency} />{:else}not reported{/if}
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
		<ItemSwitch {plan} {contentHash} path="flows.{card.paymentId}" label={card.id} onTry={onTry} />
	{/if}
</li>
