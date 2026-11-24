<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import { TAX_FLAG_KEYS } from "../../lib/edit/tax-flags"
import { blankDraft, draftOf } from "../../lib/view/tax-settings/draft"
import { GROUPS, type GroupKey } from "../../lib/view/tax-settings/groups"
import { taxEdit } from "../../lib/view/tax-settings/profile-edit"
import { needsWholeProfile, taxShown } from "../../lib/view/tax-settings/refusal"
import ItemActions from "../plan-items/ItemActions.svelte"
import TaxFlowLabels from "./TaxFlowLabels.svelte"
import TaxProfileFields from "./TaxProfileFields.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which the Edit names (cli ADR 0055). */
	contentHash: string
	/** The stored profile; null when none is stored, and then the profile is set whole. */
	profile: TaxProfile | null
	/** The group whose items a change shows; null shows every item. Stating the whole profile shows every item. */
	group?: GroupKey | null
	/** The income Flows with no tax label: a whole write labels each, because `traj` refuses a plan with an unlabelled one. */
	unlabelled?: readonly string[]
	onDone: () => void
}

let { name, contentHash, profile, group = null, unlabelled = [], onDone }: Props = $props()
// A stored profile is changed one item at a time; with none stored (or by choice) the whole profile is stated. The form is
// made again when the plan changes, so `origin` is the profile this form opened with and a save sends what differs from it.
const initial = () => draftOf(profile)
const unstored = () => profile === null
const origin = initial()
let whole = $state(unstored())
let draft = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
let labels: Record<string, string> = $state({})
const merging = $derived(profile !== null && !whole)
const visible = $derived(
	merging && group !== null
		? (GROUPS.find((one) => one.key === group)?.items ?? TAX_FLAG_KEYS)
		: TAX_FLAG_KEYS,
)
const shown = $derived(taxShown(problems, editSession.failure, editSession.error, visible))
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
	const result = taxEdit(
		{ name, contentHash, origin: unstored() ? null : origin, unlabelled },
		draft,
		whole,
		labels,
	)
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
	<TaxProfileFields bind:draft {shown} {visible} />
	{#if !merging}<TaxFlowLabels flows={unlabelled} bind:labels {shown} />{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	{#if needsWholeProfile(editSession.failure)}
		<button type="button" class={button} onclick={() => switchTo(true)}>Set the whole profile</button>
	{/if}
	{#if profile !== null}
		<button type="button" class={button} onclick={() => switchTo(merging)}>
			{merging ? "State the whole profile instead" : "Change one item instead"}
		</button>
	{/if}
	<ItemActions />
</form>
