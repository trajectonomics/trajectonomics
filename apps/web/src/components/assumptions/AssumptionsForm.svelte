<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioShow } from "../../lib/contract"
import { documentFromDraft } from "../../lib/view/assumptions/build"
import { draftOf } from "../../lib/view/assumptions/draft"
import { inflationSwingOf } from "../../lib/view/assumptions/inflation"
import { assumptionsShown } from "../../lib/view/assumptions/refusal"
import { accountIds } from "../../lib/view/plan-items/document"
import Field from "../plan-items/Field.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import AccountRow from "./AccountRow.svelte"
import AssumptionsActions from "./AssumptionsActions.svelte"
import { tryValues } from "./try-values"

interface Props {
	/** The plan the values belong to: the Edit saves under this name, over the hash the page read. */
	name: string
	show: ScenarioShow["scenario"]
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { name, show, editable }: Props = $props()
const SOURCE = "assumptions"
// The form is made again when the plan's hash changes (see AssumptionsBody), so it opens on the stored values.
const initial = () => draftOf(show.document)
let draft = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
// An error shows here only while this form sent the request (the Chance form sends as "form").
const mine = $derived(editSession.source === SOURCE)
const ids = $derived(accountIds(show.document))
const swing = $derived(inflationSwingOf(show))
const shown = $derived(
	assumptionsShown(
		problems,
		mine ? editSession.failure : null,
		mine ? editSession.error : null,
		ids,
	),
)

/** Saves every value as one Edit over the document the page read. A refusal lands on the row its path names. */
async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = documentFromDraft(show.document, draft)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	if (result.ok) {
		await editSession.run(
			{ kind: "apply-plan", name, contentHash: show.contentHash, document: result.document },
			SOURCE,
		)
	}
}

/** Puts the changed values in the What-if session instead of saving them. */
function tryThem(): void {
	const result = documentFromDraft(show.document, draft)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	if (result.ok) tryValues(name, show.contentHash, show.document, result.document)
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Assumptions of {name}">
	<StaleNotice shows="stale" />
	<section class="space-y-3" aria-labelledby="prices">
		<h2 id="prices" class="text-base font-semibold">Prices</h2>
		<div class="max-w-xs">
			<Field
				id="inflation"
				label="Inflation a year"
				inputmode="decimal"
				hint="A percent, such as 3."
				bind:value={draft.inflation}
				problem={shown.at("inflation")}
				disabled={!editable}
			/>
			{#if swing}<p class="text-sm text-muted-foreground">{swing}</p>{/if}
		</div>
	</section>
	<section class="space-y-3" aria-labelledby="accounts">
		<h2 id="accounts" class="text-base font-semibold">Your accounts</h2>
		{#each draft.accounts as account (account.id)}
			<AccountRow
				id={account.id}
				swings={account.swings}
				bind:rate={() => account.rate, (value) => (account.rate = value)}
				bind:volatility={() => account.volatility, (value) => (account.volatility = value)}
				bind:feeRate={() => account.fee.rate, (value) => (account.fee.rate = value)}
				bind:feeRounding={() => account.fee.rounding, (value) => (account.fee.rounding = value)}
				{shown}
				disabled={!editable}
			/>
		{:else}
			<p class="text-sm text-muted-foreground">This plan states no asset Account.</p>
		{/each}
	</section>
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	{#if editable}<AssumptionsActions busy={editSession.busy} ontry={tryThem} />{/if}
</form>
