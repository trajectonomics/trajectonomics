<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { AllowancePlan } from "../../lib/snapshot/allowance-params"
import {
	draftOf,
	type InputProblems,
	ORDER_NOTE,
	orderOf,
	planFromDraft,
	SSF_WORDS,
} from "../../lib/view/allowances"
import Field from "../plan-items/Field.svelte"
import OrderList from "./OrderList.svelte"

interface Props {
	/** The inputs the Snapshot's reads were made with, or null before the person has chosen. */
	inputs: AllowancePlan | null
}

let { inputs }: Props = $props()
// The form starts from the Snapshot's inputs and then holds what the person types.
// svelte-ignore state_referenced_locally
let order = $state(orderOf(inputs))
// svelte-ignore state_referenced_locally
let draft = $state(draftOf(inputs))
let problems: InputProblems = $state({})

/** Reads again with the inputs the form states. A refusal of the form stays at its field. */
async function read(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = planFromDraft(order, draft)
	problems = result.ok ? {} : result.problems
	if (result.ok) await editSession.reread(result.plan)
}
</script>

<form onsubmit={read} aria-label="Your order and limits" class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
	<h2 class="text-base font-semibold">Your order</h2>
	<p class="text-sm text-muted-foreground">{ORDER_NOTE} {SSF_WORDS}</p>
	<OrderList bind:order problem={problems.labels} />
	<div class="grid gap-4 sm:grid-cols-3">
		<Field id="allowance-step" label="Step" inputmode="decimal" hint="One step, such as 1000" bind:value={draft.step} problem={problems.step} />
		<Field id="allowance-budget" label="Yearly budget (optional)" inputmode="decimal" hint="The most to add in a year" bind:value={draft.budget} problem={problems.budget} />
		<Field id="allowance-min" label="Least saving per step, % (optional)" inputmode="decimal" hint="From 0 to 100" bind:value={draft.minSaving} problem={problems.minSaving} />
	</div>
	<button type="submit" disabled={editSession.busy} class="rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
		{editSession.busy ? "Reading…" : "Read the allowances"}
	</button>
	{#if editSession.error !== null}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
</form>
