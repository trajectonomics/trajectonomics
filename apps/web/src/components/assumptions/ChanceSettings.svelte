<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ProjectionChance, Read, Snapshot } from "../../lib/contract"
import { isCliError } from "../../lib/edit/failure"
import { chanceInputsOf, chanceSourceWords, chanceTextOf } from "../../lib/view/assumptions/chance"
import Field from "../plan-items/Field.svelte"
import ChanceSource from "./ChanceSource.svelte"

interface Props {
	params: Snapshot["params"]
	/** The chance read of the plan the page shows, when the Snapshot holds one. */
	read: Read<ProjectionChance> | undefined
	editable: boolean
}

let { params, read, editable }: Props = $props()
// The Snapshot's own paths and seed, or empty when it states none: nothing is made up for the person.
const initial = () => chanceTextOf(params)
let text = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
// An error shows here only while this form sent the request (the Assumptions form sends as "assumptions").
const mine = $derived(editSession.source === "form")
const source = $derived(read?.ok ? chanceSourceWords(read.data) : null)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Reads the chance of success again with these paths and this seed. Nothing is written to the plan. */
async function apply(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = chanceInputsOf(text)
	problems = result.ok ? {} : result.problems
	editSession.clear()
	if (result.ok) await editSession.rereadChance({ paths: result.paths, seed: result.seed })
}
</script>

<form onsubmit={apply} class="space-y-4" aria-label="Chance of success">
	<h2 class="text-base font-semibold">Chance of success</h2>
	<p class="text-sm text-muted-foreground">
		The chance draws seeded market paths from the returns and swings above. The same paths and seed give the same answer.
	</p>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field id="chance-paths" label="Market paths" inputmode="numeric" hint="A whole number from 1 to 10,000" bind:value={text.paths} problem={problems["paths"]} disabled={!editable} />
		<Field id="chance-seed" label="Seed" hint="Sixteen lower-case hex digits" bind:value={text.seed} problem={problems["seed"]} disabled={!editable} />
	</div>
	{#if source}<ChanceSource {source} />{/if}
	{#if read && !read.ok}
		<p role="alert" class="text-sm text-destructive" data-cli={isCliError(read.error) ? "" : undefined}>{read.error.message}</p>
	{:else if !read}
		<p class="text-sm text-muted-foreground">No chance of success is read yet: enter the paths and the seed.</p>
	{/if}
	{#if mine && editSession.error}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
	{#if editable}
		<button type="submit" disabled={editSession.busy} class={button}>Read the chance again</button>
	{/if}
</form>
