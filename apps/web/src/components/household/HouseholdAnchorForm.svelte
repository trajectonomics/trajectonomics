<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { HouseholdDocument, ScenarioFlow } from "../../lib/contract"
import {
	type AnchorDraft,
	anchorDraftOf,
	anchorFromDraft,
} from "../../lib/view/household/anchor-draft"
import { householdWithAnchor } from "../../lib/view/household/document"
import { EDGE_CHOICES, WHEN_CHOICES } from "../../lib/view/plan-items/options"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import Field from "../plan-items/Field.svelte"

interface Props {
	/** The Scenario the household belongs to: the Edit saves its household under this name. */
	name: string
	household: HouseholdDocument
	/** The Flows the Scenario holds: the items a date may be pinned on. */
	flows: readonly ScenarioFlow[]
	/** Runs once the Edit has run, so the drawer closes. */
	onDone: () => void
}

let { name, household, flows, onDone }: Props = $props()
/** The first choice of each select says nothing is chosen yet, so the form invents no item, person or date. */
const BLANK = { value: "", label: "Choose" }
const edgeChoices = [BLANK, ...EDGE_CHOICES]
const people = $derived(household.people.map((person) => person.id))
let draft: AnchorDraft = $state(anchorDraftOf())
let problems: Problems = $state({})
const FIELDS = ["flow", "edge", "person", "when", "age"]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))
const flowChoices = $derived([BLANK, ...flows.map((flow) => ({ value: flow.id, label: flow.id }))])
const personChoices = $derived([BLANK, ...people.map((id) => ({ value: id, label: id }))])

/** Saves the household with this anchor as one Edit; the drawer closes only when it ran. */
async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = anchorFromDraft(draft)
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	const next = householdWithAnchor(household, result.anchor)
	if (await editSession.run({ kind: "set-household", name, household: next })) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Pin a date to a person">
	<Field id="anchor-flow" label="Item" options={flowChoices} bind:value={draft.flow} problem={shown.at("flow")} />
	<Field id="anchor-edge" label="Date" options={edgeChoices} bind:value={draft.edge} problem={shown.at("edge")} />
	<Field id="anchor-person" label="Pinned to" options={personChoices} bind:value={draft.person} problem={shown.at("person")} />
	<Field id="anchor-when" label="When" options={WHEN_CHOICES} bind:value={draft.when} problem={shown.at("when")} />
	{#if draft.when === "age"}
		<Field id="anchor-age" label="Age" inputmode="decimal" hint="The age in whole years. The date is the last day of that person's birth month in that year." bind:value={draft.age} problem={shown.at("age")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<button type="submit" disabled={editSession.busy} class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Pin the date</button>
</form>
