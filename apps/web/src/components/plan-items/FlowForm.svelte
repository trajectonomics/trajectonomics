<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { deleteFlow, saveFlow } from "../../client/flow-save.js"
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { employerOf, employerTargets } from "../../lib/view/plan-items/employer"
import { employerDraftOf } from "../../lib/view/plan-items/employer-draft"
import { categoriesOf, type FlowKind, flowDraftOf } from "../../lib/view/plan-items/flows"
import { slugId } from "../../lib/view/plan-items/form"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { namedRefusal } from "../../lib/view/plan-items/refusal"
import { idsAfterSave } from "../../lib/view/plan-items/salary-draft"
import FlowFields from "./FlowFields.svelte"
import ItemActions from "./ItemActions.svelte"
import TryNotice from "./TryNotice.svelte"

interface Props {
	kind: FlowKind
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	doc: ScenarioDocument
	/** The household of the plan: a date it pins is read-only here. Null without one. */
	household: HouseholdDocument | null
	/** The Flow to edit; absent for a new one. */
	existing?: ScenarioFlow | undefined
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. */
	onDone: () => void
	/** True when the drawer tries values in the What-if session, instead of saving them. */
	tryValue?: boolean
}

let {
	kind,
	name,
	doc,
	household,
	existing,
	onDone,
	contentHash,
	tryValue = false,
}: Props = $props()
const anchors = $derived(flowAnchorLabels(household, existing?.id ?? ""))
const initial = () => flowDraftOf(existing)
let draft = $state(initial())
/** What the employer adds on top of a salary: nothing until the person fills it in. */
const initialEmployer = () =>
	employerDraftOf(existing === undefined ? null : employerOf(doc.flows, existing.id))
let employer = $state(initialEmployer())
let problems: Problems = $state({})
/** The fields a tried value cleared, which a what-if cannot hold. */
let cleared: string[] = $state([])
const FIELDS = [
	"name",
	"amount",
	"frequency",
	"start",
	"end",
	"growth",
	"rate",
	"earned",
	"category",
	"employerAccount",
	"employerShare",
	"employerRounding",
]
/** The refusal with the Flow's position in its path named by id, so one on the employer's Flow lands in its section. */
const refusal = $derived(
	namedRefusal(editSession.failure, idsAfterSave(doc, existing?.id ?? slugId(draft.name))),
)
const shown = $derived(shownProblems(problems, refusal, editSession.error, FIELDS))

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const saved = await saveFlow({
		name,
		contentHash,
		doc,
		kind,
		existing,
		draft,
		employer,
		tryValue,
	})
	problems = saved.problems
	cleared = saved.cleared
	if (saved.done) onDone()
}

async function remove(): Promise<void> {
	if (await deleteFlow({ name, contentHash, doc }, existing?.id ?? "")) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : `Add ${kind}`}>
	<FlowFields bind:draft bind:employer {kind} {existing} {shown} {name} {anchors} categories={categoriesOf(doc.flows)} targets={employerTargets(doc)} />
	<TryNotice fields={cleared} />
	<ItemActions id={existing?.id} onDelete={remove} trying={tryValue} />
</form>
