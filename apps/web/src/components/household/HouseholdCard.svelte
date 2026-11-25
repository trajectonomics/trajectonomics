<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import type { HouseholdDocument, ScenarioDocument } from "../../lib/contract"
import { householdWithoutAnchor } from "../../lib/view/household/document"
import { personCards } from "../../lib/view/household/model"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import HouseholdAnchorForm from "./HouseholdAnchorForm.svelte"
import HouseholdAnchors from "./HouseholdAnchors.svelte"
import HouseholdPeople from "./HouseholdPeople.svelte"
import HouseholdPersonForm from "./HouseholdPersonForm.svelte"
import HouseholdRemove from "./HouseholdRemove.svelte"

interface Props {
	/** The Scenario the household belongs to: the Edits save its household under this name. */
	name: string
	doc: ScenarioDocument
	household: HouseholdDocument | null
	/** The content hash of the Scenario the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { name, doc, household, editable, contentHash }: Props = $props()

/** The drawer: the person form (for a new person, or the one of that id) or the anchor form; null when shut. */
type Form = { form: "person"; id?: string } | { form: "anchor" }
let shown = $state<Form | null>(null)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
const busy = $derived(editSession.busy)
const people = $derived(personCards(household))
const existing = $derived(
	household?.people.find((person) => shown?.form === "person" && person.id === shown.id),
)
const title = $derived.by(() => {
	if (shown?.form === "anchor") return "Pin a date to a person"
	if (shown?.form === "person" && shown.id !== undefined)
		return `Edit ${currentItemText("person", shown.id)}`
	return household === null ? "Set up the household" : "Add a person"
})

/** Opens or shuts the drawer. A refusal from an earlier save is forgotten, so it never shows on the next form. */
function open(next: Form | null): void {
	editSession.clear()
	shown = next
}

/** Removes the anchor of a path, as one write of the household without it. */
async function unpin(path: string): Promise<void> {
	if (household === null) return
	await editSession.run({
		kind: "set-household",
		name,
		contentHash,
		household: householdWithoutAnchor(household, path),
	})
}
</script>

<section id="household" class="space-y-4 rounded-lg border border-border bg-card p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="font-semibold">Household</h2>
			<p class="text-sm text-muted-foreground">
				The people whose ages pin the dates of plan {name}. Ages appear on the rows once they are set.
			</p>
		</div>
		{#if editable}
			<div class="flex flex-wrap gap-2">
				<button type="button" disabled={busy} onclick={() => open({ form: "person" })} class={button}>
					{household === null ? "Set up the household" : "Add a person"}
				</button>
				{#if household !== null && people.length > 0}
					<button type="button" disabled={busy} onclick={() => open({ form: "anchor" })} class={button}>
						Pin a date
					</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if household === null}
		<p class="text-sm text-foreground">No household is set for plan {name}.</p>
	{:else}
		<HouseholdPeople {people} {editable} onEdit={(id) => open({ form: "person", id })} />
		<HouseholdAnchors anchors={household.anchors} {editable} onRemove={unpin} />
		{#if editable}
			<HouseholdRemove {name} {contentHash} />
		{/if}
	{/if}
	<Drawer open={shown !== null} {title} onClose={() => open(null)}>
		<StaleNotice />
		{#if shown?.form === "anchor" && household !== null}
			<HouseholdAnchorForm {name} {household} {contentHash} flows={doc.flows} onDone={() => open(null)} />
		{:else if shown?.form === "person"}
			<HouseholdPersonForm {name} {household} {contentHash} existing={existing} onDone={() => open(null)} />
		{/if}
	</Drawer>
</section>
