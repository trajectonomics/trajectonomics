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
/** True when a what-if of this plan is open: Add to plan waits for it, a what-if of another plan does not. */
const planOpen = $derived(whatIfSession.active && whatIfSession.whatIf?.plan === plan.name)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Starts or joins the What-if session with the year's Flows added, so every figure page shows them. */
function tryYear(): void {
	whatIfSession.addItems(plan.name, plan.contentHash, suggestionAdditions(year.placeable))
}

/** Writes the year's Flows with one `apply-plan` Edit that names the hash the page read. */
async function addToPlan(): Promise<void> {
	await editSession.run(
		{
			kind: "apply-plan",
			name: plan.name,
			contentHash: plan.contentHash,
			document: documentWithSuggestions(plan.doc, year.placeable),
		},
		year.key,
	)
}
</script>

<!-- A year's suggestions, tried on the whole plan first or kept as Flows. A suggestion with no Account says which to add. -->
<div class="space-y-3">
	{#if year.addable}
		<div class="flex flex-wrap gap-2">
			<button type="button" class={button} disabled={editSession.busy || whatIfSession.saving} onclick={tryYear}>Try this year as a what-if</button>
			<button type="button" class={button} disabled={editSession.busy || planOpen} onclick={addToPlan}>Add to plan</button>
		</div>
		{#if planOpen}<p class="text-sm text-muted-foreground">Apply or revert the what-if first, then Add to plan.</p>{/if}
	{/if}
	{#if year.unplaced.length > 0}
		<div class="text-sm">
			<p>
				Add an asset Account for {year.addable ? "these as well" : "these first"}, in
				<SiteLink href="/assets-and-debts/" class="underline">Assets and debts</SiteLink>:
			</p>
			<ul class="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
				{#each year.unplaced as one (one.name)}<li>{one.name}: <span data-cli>{one.hint}</span></li>{/each}
			</ul>
		</div>
	{/if}
	<StaleNotice />
	{#if editSession.error !== null && editSession.source === year.key}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
</div>
