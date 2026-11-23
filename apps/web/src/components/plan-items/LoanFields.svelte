<script lang="ts">
import type { LoanDraft } from "../../lib/view/plan-items/loan-draft"
import {
	type OwedChoice,
	owedChoiceOf,
	owedSelectChoices,
	owedUnavailable,
} from "../../lib/view/plan-items/loan-owed"
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
	/** The debts of the Baseline a loan may attach to, each with the balance the Baseline states. */
	choices: readonly OwedChoice[]
	shown: Shown
}

let { draft = $bindable(), editing, choices, shown }: Props = $props()
const unavailable = $derived(owedUnavailable(choices))
const arrivals = $derived(
	unavailable !== null && draft.arrival !== "owed" ? ARRIVAL_CHOICES.slice(1) : ARRIVAL_CHOICES,
)
const debt = $derived(owedChoiceOf(choices, draft.owedAccount))
</script>

<!-- The fields of a loan. Amounts and dates are text as typed; the payment's rounding has no default. -->
<div class="space-y-4">
	{#if editing}
		<p class="text-sm text-foreground">Loan <span class="font-medium">{draft.name}</span></p>
	{:else if draft.arrival === "date"}
		<Field id="loan-name" label="Name" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="loan-principal" label="Amount borrowed" inputmode="decimal" hint="A decimal number, such as 500000.00" bind:value={draft.principal} problem={shown.at("principal")} />
	<Field id="loan-rate" label="Interest rate a year" inputmode="decimal" hint="A percent with at most two places, such as 6.25" bind:value={draft.rate} problem={shown.at("rate")} />
	<Field id="loan-compounding" label="Interest is added" options={LOAN_COMPOUNDING_CHOICES} bind:value={draft.compounding} problem={shown.at("compounding")} />
	<Field id="loan-payments" label="Number of payments" inputmode="decimal" hint="One payment each time interest is added" bind:value={draft.payments} problem={shown.at("payments")} />
	<Field id="loan-first" label="First payment" hint="YYYY-MM-DD" bind:value={draft.firstPayment} problem={shown.at("firstPayment")} />
	<Field id="loan-rounding" label="Each payment rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("rounding")} />
	<Field id="loan-arrival" label="The money" options={arrivals} bind:value={draft.arrival} problem={shown.at("arrival")} />
	{#if unavailable !== null && draft.arrival !== "owed"}
		<p class="-mt-3 text-xs text-muted-foreground">"I already owe it" is unavailable: {unavailable}</p>
	{/if}
	{#if draft.arrival === "owed" && !editing}
		<Field id="loan-owed-account" label="The debt" hint="A debt the Baseline holds, which this loan repays" options={owedSelectChoices(choices)} bind:value={draft.owedAccount} problem={shown.at("owedAccount")} />
	{/if}
	{#if debt !== undefined && draft.arrival === "owed"}
		<p class="-mt-3 text-sm text-muted-foreground">The Baseline owes <Money amount={debt.balance} /> on {debt.name}.</p>
	{/if}
	{#if draft.arrival === "date"}
		<Field id="loan-arrival-date" label="Borrowed on" hint="YYYY-MM-DD" bind:value={draft.arrivalDate} problem={shown.at("arrivalDate")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
