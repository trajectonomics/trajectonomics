<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioShow } from "../../lib/contract"
import { documentFromDraft } from "../../lib/view/assumptions/build"
import { draftOf } from "../../lib/view/assumptions/draft"
import { assumptionsShown } from "../../lib/view/assumptions/refusal"
import { accountIds } from "../../lib/view/plan-items/document"
import Field from "../plan-items/Field.svelte"
import TryNotice from "../plan-items/TryNotice.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import AccountRow from "./AccountRow.svelte"
import { type TriedValues, tryValues } from "./try-values"

interface Props {
	/** The plan the values belong to: the Edit saves under this name, over the hash the page read. */
	name: string
	show: ScenarioShow["scenario"]
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { name, show, editable }: Props = $props()
// The form is made again when the plan's hash changes (see AssumptionsBody), so it opens on the stored values.
const initial = () => draftOf(show.document)
let draft = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
let tried: TriedValues | null = $state(null)
const ids = $derived(accountIds(show.document))
const shown = $derived(assumptionsShown(problems, editSession.failure, editSession.error, ids))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Saves every value as one Edit over the document the page read. A refusal lands on the row its path names. */
async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = documentFromDraft(show.document, draft)
	editSession.clear()
	tried = null
	problems = result.ok ? {} : result.problems
	if (result.ok) {
		await editSession.run({
			kind: "apply-plan",
			name,
			contentHash: show.contentHash,
			document: result.document,
		})
	}
}

/** Puts the changed values in the What-if session instead of saving them. */
function tryThem(): void {
	const result = documentFromDraft(show.document, draft)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	tried = result.ok ? tryValues(name, show.contentHash, show.document, result.document) : null
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Assumptions of {name}">
	<StaleNotice />
	<section class="space-y-3" aria-labelledby="prices">
		<h2 id="prices" class="text-base font-semibold">Prices</h2>
		<div class="max-w-xs">
			<Field
				id="inflation"
				label="Inflation a year"
				inputmode="decimal"
				hint="A percent, such as 3. Empty states none."
				bind:value={draft.inflation}
				problem={shown.at("inflation")}
				disabled={!editable}
			/>
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
				{shown}
				disabled={!editable}
			/>
		{:else}
			<p class="text-sm text-muted-foreground">This plan states no asset Account.</p>
		{/each}
	</section>
	<TryNotice fields={tried?.cleared ?? []} />
	{#if tried?.inflationUntried}
		<p role="alert" class="text-sm text-destructive">A what-if replaces a value the plan holds, and this plan states no inflation yet. Save one first to try another.</p>
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	{#if editable}
		<div class="flex flex-wrap gap-2 border-t border-border pt-4">
			<button type="submit" disabled={editSession.busy} class={button}>Save</button>
			<button type="button" disabled={editSession.busy} onclick={tryThem} class={button}>Try as what-if</button>
		</div>
	{/if}
</form>
