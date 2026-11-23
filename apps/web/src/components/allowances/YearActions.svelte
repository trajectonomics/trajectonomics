<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import {
	documentWithSuggestions,
	suggestionAdditions,
	type YearView,
} from "../../lib/view/allowances"
import SiteLink from "../ui/SiteLink.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"

interface Props {
	year: YearView
	/** The plan the suggestions go into: its name, the hash the page read and its items as stored. */
	plan: { name: string; contentHash: string; doc: ScenarioDocument }
}

let { year, plan }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Starts or joins the What-if session with the year's Flows added, so every figure page shows them. */
function tryYear(): void {
	whatIfSession.addItems(plan.name, plan.contentHash, suggestionAdditions(year.flows))
}

/** Writes the year's Flows with one `apply-plan` Edit that names the hash the page read. */
async function addToPlan(): Promise<void> {
	await editSession.run({
		kind: "apply-plan",
		name: plan.name,
		contentHash: plan.contentHash,
		document: documentWithSuggestions(plan.doc, year.flows),
	})
}
</script>

<!-- A year's suggestions, tried on the whole plan first or kept as Flows. A suggestion with no Account says which to add. -->
<div class="space-y-3">
	{#if year.addable}
		<div class="flex flex-wrap gap-2">
			<button type="button" class={button} disabled={editSession.busy || whatIfSession.saving} onclick={tryYear}>Try this year as a what-if</button>
			<button type="button" class={button} disabled={editSession.busy || whatIfSession.active} onclick={addToPlan}>Add to plan</button>
		</div>
		{#if whatIfSession.active}<p class="text-sm text-muted-foreground">Apply or revert the what-if first, then Add to plan.</p>{/if}
	{:else if year.flows.length > 0}
		<p class="text-sm">
			Add an asset Account for these first, in
			<SiteLink href="/assets-and-debts/" class="underline">Assets and debts</SiteLink>.
		</p>
	{/if}
	<StaleNotice />
	{#if editSession.error !== null}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
</div>
