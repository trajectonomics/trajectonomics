<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { withFlow } from "../../lib/view/plan-items/document"
import {
	type ExtraDraft,
	extraDraftOf,
	extraFromDraft,
} from "../../lib/view/plan-items/extra-payment"
import { EXTRA_MODE_CHOICES } from "../../lib/view/plan-items/options"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import Field from "./Field.svelte"
import ItemActions from "./ItemActions.svelte"

interface Props {
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	doc: ScenarioDocument
	/** The id of the loan's liability Account, which the payment goes into. */
	loanId: string
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. */
	onDone: () => void
}

let { name, contentHash, doc, loanId, onDone }: Props = $props()
let draft: ExtraDraft = $state(extraDraftOf())
let problems: Problems = $state({})
const FIELDS = ["amount", "mode", "start", "end"]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))

/** Saves the plan with the payment added, as one Edit; the drawer closes only when it ran. */
async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = extraFromDraft(draft, { loanId, doc })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	const document = withFlow(doc, result.flow)
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document })) onDone()
}
</script>

<!-- A payment into the loan, once or every month until an end. The engine caps it at what is owed. -->
<form onsubmit={save} class="space-y-6" aria-label="Pay extra on {loanId}">
	<div class="space-y-4">
		<Field id="extra-amount" label="Amount" inputmode="decimal" hint="A decimal number, such as 10000.00" bind:value={draft.amount} problem={shown.at("amount")} />
		<Field id="extra-mode" label="How often" options={EXTRA_MODE_CHOICES} bind:value={draft.mode} problem={shown.at("mode")} />
		<Field id="extra-start" label="Starts" hint="YYYY-MM-DD" bind:value={draft.start} problem={shown.at("start")} />
		{#if draft.mode === "monthly"}
			<Field id="extra-end" label="Last payment" hint="YYYY-MM-DD" bind:value={draft.end} problem={shown.at("end")} />
		{/if}
		{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	</div>
	<ItemActions />
</form>
