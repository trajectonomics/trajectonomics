<script lang="ts">
import type { LoanDraft } from "../../lib/view/plan-items/loan-draft"
import { LOAN_COMPOUNDING_CHOICES, ROUNDING_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "./Field.svelte"

interface Props {
	draft: LoanDraft
	shown: Shown
	/** What a field's name starts with in the form's problems: empty for a loan form, "loan." inside an asset's. */
	prefix?: string
}

let { draft = $bindable(), shown, prefix = "" }: Props = $props()
const at = (field: string) => shown.at(`${prefix}${field}`)
</script>

<!-- The terms every loan states: its amount, rate, how interest is added, its payments and their rounding. -->
<Field id="loan-principal" label="Amount borrowed" inputmode="decimal" hint="A decimal number, such as 500000.00" bind:value={draft.principal} problem={at("principal")} />
<Field id="loan-rate" label="Interest rate a year" inputmode="decimal" hint="Your own estimate: a percent with at most two places, such as 6.25" bind:value={draft.rate} problem={at("rate")} />
<Field id="loan-compounding" label="Interest is added" options={LOAN_COMPOUNDING_CHOICES} bind:value={draft.compounding} problem={at("compounding")} />
<Field id="loan-payments" label="Number of payments" inputmode="decimal" hint="One payment each time interest is added" bind:value={draft.payments} problem={at("payments")} />
<Field id="loan-first" label="First payment" hint="YYYY-MM-DD" bind:value={draft.firstPayment} problem={at("firstPayment")} />
<Field id="loan-rounding" label="Each payment rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={at("rounding")} />
