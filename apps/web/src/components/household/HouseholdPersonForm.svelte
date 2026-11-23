<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { HouseholdDocument, HouseholdPerson } from "../../lib/contract"
import { householdWithoutPerson, householdWithPerson } from "../../lib/view/household/document"
import {
	type PersonDraft,
	personDraftOf,
	personFromDraft,
} from "../../lib/view/household/person-draft"
import { RELATION_CHOICES, ROLE_CHOICES } from "../../lib/view/plan-items/options"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import Field from "../plan-items/Field.svelte"
import ItemActions from "../plan-items/ItemActions.svelte"

interface Props {
	/** The Scenario the household belongs to: the Edit saves its household under this name. */
	name: string
	/** The household as it is now, or null when there is none yet. */
	household: HouseholdDocument | null
	/** The content hash of the Scenario the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	/** The person to edit; absent for a new one. */
	existing?: HouseholdPerson | undefined
	/** Runs once the Edit has run, so the drawer closes. */
	onDone: () => void
}

let { name, household, existing, onDone, contentHash }: Props = $props()
/** The relation is chosen, never assumed: the first choice says so. */
const RELATION_CHOICES_WITH_BLANK = [{ value: "", label: "Choose a relation" }, ...RELATION_CHOICES]
const ROLE_CHOICES_WITH_BLANK = [{ value: "", label: "Choose a role" }, ...ROLE_CHOICES]
// The first person is the account holder, which a household must have; any later one has no role until chosen.
const initial = () => personDraftOf(existing, household === null ? "holder" : "")
let draft: PersonDraft = $state(initial())
let problems: Problems = $state({})
const FIELDS = ["name", "role", "relation", "born", "lifeExpectancy", "joins"]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))
const taken = $derived((household?.people ?? []).map((person) => person.id))

/** Saves the household as one Edit; the drawer closes only when it ran. */
async function commit(next: HouseholdDocument): Promise<void> {
	if (await editSession.run({ kind: "set-household", name, contentHash, household: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = personFromDraft(draft, { existing, taken })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	await commit(householdWithPerson(household, result.person))
}

/** Removes the person from the household. The anchors that name them stay, and traj refuses that. */
async function removePerson(): Promise<void> {
	if (household === null || existing === undefined) return
	await commit(householdWithoutPerson(household, existing.id))
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : "Add a person"}>
	{#if existing}
		<p class="text-sm text-foreground">Person <span class="font-medium">{existing.id}</span></p>
	{:else}
		<Field id="person-name" label="Name" hint="A short name for the person, such as me or partner" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="person-role" label="Role" options={existing || household === null ? ROLE_CHOICES : ROLE_CHOICES_WITH_BLANK} bind:value={draft.role} problem={shown.at("role")} />
	{#if draft.role === "dependent"}
		<Field id="person-relation" label="Relation to the account holder" options={RELATION_CHOICES_WITH_BLANK} bind:value={draft.relation} problem={shown.at("relation")} />
	{/if}
	<Field id="person-born" label="Born" hint="The birth month, YYYY-MM" bind:value={draft.born} problem={shown.at("born")} />
	<Field id="person-life" label="Life expectancy" inputmode="decimal" hint="The age at which life ends, as a whole number. There is no default." bind:value={draft.lifeExpectancy} problem={shown.at("lifeExpectancy")} />
	{#if draft.role === "partner"}
		<Field id="person-joins" label="Joins the plan" hint="The month, YYYY-MM, or empty when the partner is in the plan from the start" bind:value={draft.joins} problem={shown.at("joins")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<ItemActions id={existing?.id} onDelete={removePerson} />
</form>
