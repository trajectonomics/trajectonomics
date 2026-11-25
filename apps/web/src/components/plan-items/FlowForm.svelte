<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { deleteFlow, saveFlow } from "../../client/flow-save.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { employerOf, employerTargets, salaryDeleteNote } from "../../lib/view/plan-items/employer"
import { employerDraftOf } from "../../lib/view/plan-items/employer-draft"
import { categoriesOf, type FlowKind, flowDraftForTry } from "../../lib/view/plan-items/flows"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { namedRefusal } from "../../lib/view/plan-items/refusal"
import { shownFlows } from "../../lib/what-if/routing"
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
/** The plan's Flows as the form starts from them: as the session shows them, added Flows too, so a new try carries the earlier ones. */
const startFlows = () => (tryValue ? shownFlows(doc, whatIfSession.whatIf, name) : doc.flows)
const initial = () => flowDraftForTry(startFlows(), existing?.id, existing)
let draft = $state(initial())
/** What the employer adds on top of a salary: nothing until the person fills it in. */
const initialEmployer = () =>
	employerDraftOf(existing === undefined ? null : employerOf(startFlows(), existing.id))
let employer = $state(initialEmployer())
let problems: Problems = $state({})
/** The fields a tried value cleared, which a what-if cannot hold. */
let cleared: string[] = $state([])
const FIELDS = [
	"name",
	"displayLabel",
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
/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
let sent: string[] = $state([])
/** The refusal with the Flow's position in its path named by id, so one on the employer's Flow lands in its section. */
const refusal = $derived(namedRefusal(editSession.failure, sent))
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
	sent = saved.sent
	if (saved.done) onDone()
}

async function remove(): Promise<void> {
	if (await deleteFlow({ name, contentHash, doc }, existing?.id ?? "")) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : `Add ${kind}`}>
	<FlowFields bind:draft bind:employer {kind} {existing} {shown} {name} {anchors} trying={tryValue} categories={categoriesOf(doc.flows)} targets={employerTargets(doc)} />
	<TryNotice fields={cleared} />
	<ItemActions id={existing?.id} kind="flow" onDelete={remove} trying={tryValue} note={existing === undefined ? undefined : salaryDeleteNote(doc.flows, existing.id)} />
</form>
