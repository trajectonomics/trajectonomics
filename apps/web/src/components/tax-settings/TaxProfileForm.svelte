<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import { blankDraft, draftOf, taxEdit } from "../../lib/view/tax-settings/draft"
import { needsWholeProfile, taxShown } from "../../lib/view/tax-settings/refusal"
import ItemActions from "../plan-items/ItemActions.svelte"
import TaxProfileFields from "./TaxProfileFields.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which the Edit names (cli ADR 0055). */
	contentHash: string
	/** The stored profile; null when none is stored, and then the profile is set whole. */
	profile: TaxProfile | null
	onDone: () => void
}

let { name, contentHash, profile, onDone }: Props = $props()
// A stored profile is changed one item at a time; with none stored (or by choice) the whole profile is stated.
const initial = () => draftOf(profile)
const unstored = () => profile === null
let whole = $state(unstored())
let draft = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
const shown = $derived(taxShown(problems, editSession.failure, editSession.error))
const merging = $derived(profile !== null && !whole)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Switches between changing one item and stating the whole profile; nothing is pre-filled for the whole profile. */
function switchTo(next: boolean): void {
	editSession.clear()
	problems = {}
	whole = next
	draft = next ? blankDraft() : initial()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = taxEdit({ name, contentHash, stored: profile }, draft, whole)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	if (result.ok && (await editSession.run(result.edit))) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Tax profile">
	{#if merging}
		<p class="text-sm text-muted-foreground">Change an item and save: every other item of the stored profile stays. Empty an amount to take it out.</p>
	{:else}
		<p class="text-sm text-muted-foreground">State the whole profile. Nothing is filled in for you, an item left empty is none, and anything an earlier write stated and you leave out is dropped.</p>
	{/if}
	<TaxProfileFields bind:draft {shown} />
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	{#if needsWholeProfile(editSession.failure)}
		<button type="button" class={button} onclick={() => { editSession.clear(); whole = true }}>Set the whole profile</button>
	{/if}
	{#if profile !== null}
		<button type="button" class={button} onclick={() => switchTo(merging)}>
			{merging ? "State the whole profile instead" : "Change one item instead"}
		</button>
	{/if}
	<ItemActions />
</form>
