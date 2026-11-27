<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import type { HouseholdDocument, HouseholdPerson } from "../../lib/contract"
import { householdWithoutPerson, householdWithPerson } from "../../lib/view/household/document"
import { type PersonDraft, personDraftOf } from "../../lib/view/household/person-draft"
import { personFromDraft } from "../../lib/view/household/person-save"
import { RELATION_CHOICES, ROLE_CHOICES } from "../../lib/view/plan-items/options"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import Field from "../plan-items/Field.svelte"
import ItemActions from "../plan-items/ItemActions.svelte"
import FormAlert from "../ui/FormAlert.svelte"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	/** The Scenario the household belongs to: the Edit saves its household under this name. */
	name: string
	/** The household as it is now, or null when there is none yet. */
	household: HouseholdDocument | null
	/** The hash of the document and household the page read, which every Edit to it names (cli ADR 0055). */
	householdHash: string
	/** The person to edit; absent for a new one. */
	existing?: HouseholdPerson | undefined
	/** Runs once the Edit has run, so the drawer closes. */
	onDone: () => void
}

let { name, household, existing, onDone, householdHash }: Props = $props()
/** The relation is chosen, never assumed: the first choice says so. */
const RELATION_CHOICES_WITH_BLANK = [{ value: "", label: "Choose a relation" }, ...RELATION_CHOICES]
const ROLE_CHOICES_WITH_BLANK = [{ value: "", label: "Choose a role" }, ...ROLE_CHOICES]
// The first person is the account holder, which a household must have; any later one has no role until chosen.
const initial = () => personDraftOf(existing, household === null ? "holder" : "")
let draft: PersonDraft = $state(initial())
let problems: Problems = $state({})
const FIELDS = ["name", "displayLabel", "role", "relation", "born", "lifeExpectancy", "joins"]
/** The whole path of the person the form edits, so a refusal at another person is the form's own problem. */
let item = $state("people.")
const shown = $derived(
	shownProblems(problems, editSession.failure, editSession.error, FIELDS, item),
)
const taken = $derived((household?.people ?? []).map((person) => person.id))

/** Saves the household as one Edit; the drawer closes only when it ran. */
async function commit(next: HouseholdDocument, index: number): Promise<void> {
	item = `people.${index}`
	if (
		await editSession.run(
			{ kind: "set-household", name, householdHash, household: next },
			"household",
		)
	)
		onDone()
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
	const next = householdWithPerson(household, result.person)
	await commit(
		next,
		next.people.findIndex((person) => person.id === result.person.id),
	)
}

/** Removes the person from the household. The anchors that name them stay, and traj refuses that. */
async function removePerson(): Promise<void> {
	if (household === null || existing === undefined) return
	const index = household.people.findIndex((person) => person.id === existing.id)
	await commit(householdWithoutPerson(household, existing.id), index)
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${currentItemText("person", existing.id)}` : "Add a person"}>
	{#if existing}
		<p class="text-sm text-foreground">Person <span class="font-medium"><ItemName kind="person" id={existing.id} /></span></p>
	{:else}
		<Field id="person-name" label="Id" hint="A short id for the person, such as me or partner. The card shows it in its Id row." bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="person-label" label="Name" hint="Shown in place of the id, on cards, anchors and pickers. Optional." bind:value={draft.displayLabel} problem={shown.at("displayLabel")} />
	<Field id="person-role" label="Role" options={existing || household === null ? ROLE_CHOICES : ROLE_CHOICES_WITH_BLANK} bind:value={draft.role} problem={shown.at("role")} />
	{#if draft.role === "dependent"}
		<Field id="person-relation" label="Relation to the account holder" options={RELATION_CHOICES_WITH_BLANK} bind:value={draft.relation} problem={shown.at("relation")} />
	{/if}
	<Field id="person-born" label="Born" hint="The birth month, YYYY-MM" bind:value={draft.born} problem={shown.at("born")} />
	<Field id="person-life" label="Life expectancy" inputmode="decimal" hint="The age at which life ends, as a whole number. There is no default." bind:value={draft.lifeExpectancy} problem={shown.at("lifeExpectancy")} />
	{#if draft.role === "partner"}
		<Field id="person-joins" label="Joins the plan" hint="The month, YYYY-MM, or empty when the partner is in the plan from the start" bind:value={draft.joins} problem={shown.at("joins")} />
	{/if}
	{#if shown.general}<FormAlert message={shown.general} />{/if}
	<ItemActions id={existing?.id} kind="person" onDelete={removePerson} />
</form>
