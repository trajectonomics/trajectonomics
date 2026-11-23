<script lang="ts">
import type { LoanDraft } from "../../lib/view/plan-items/loan-draft"
import {
	ARRIVAL_CHOICES,
	LOAN_COMPOUNDING_CHOICES,
	ROUNDING_CHOICES,
} from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Money from "../ui/Money.svelte"
import Field from "./Field.svelte"

interface Props {
	draft: LoanDraft
	/** Whether the loan exists already: its name is its id, and is not edited. */
	editing: boolean
	/** The balance the Baseline holds for the loan's Account, or null when it holds none. */
	owed: string | null
	shown: Shown
}

let { draft = $bindable(), editing, owed, shown }: Props = $props()
</script>

<!-- The fields of a loan. Amounts and dates are text as typed; the payment's rounding has no default. -->
<div class="space-y-4">
	{#if editing}
		<p class="text-sm text-foreground">Loan <span class="font-medium">{draft.name}</span></p>
	{:else}
		<Field id="loan-name" label="Name" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="loan-principal" label="Amount borrowed" inputmode="decimal" hint="A decimal number, such as 500000.00" bind:value={draft.principal} problem={shown.at("principal")} />
	<Field id="loan-rate" label="Interest rate a year" inputmode="decimal" hint="A percent with at most two places, such as 6.25" bind:value={draft.rate} problem={shown.at("rate")} />
	<Field id="loan-compounding" label="Interest is added" options={LOAN_COMPOUNDING_CHOICES} bind:value={draft.compounding} problem={shown.at("compounding")} />
	<Field id="loan-payments" label="Number of payments" inputmode="decimal" hint="One payment each time interest is added" bind:value={draft.payments} problem={shown.at("payments")} />
	<Field id="loan-first" label="First payment" hint="YYYY-MM-DD" bind:value={draft.firstPayment} problem={shown.at("firstPayment")} />
	<Field id="loan-rounding" label="Each payment rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("rounding")} />
	<Field id="loan-arrival" label="The money" options={ARRIVAL_CHOICES} bind:value={draft.arrival} problem={shown.at("arrival")} />
	{#if owed !== null && draft.arrival === "owed"}
		<p class="-mt-3 text-sm text-muted-foreground">The Baseline owes <Money amount={owed} /> on this account.</p>
	{/if}
	{#if draft.arrival === "date"}
		<Field id="loan-arrival-date" label="Borrowed on" hint="YYYY-MM-DD" bind:value={draft.arrivalDate} problem={shown.at("arrivalDate")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
