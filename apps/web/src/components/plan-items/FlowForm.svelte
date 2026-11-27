<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { deleteFlow, saveFlow } from "../../client/flow-save.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { employerIdOf, employerTargets, salaryDeleteNote } from "../../lib/view/plan-items/employer"
import { FLOW_FIELDS } from "../../lib/view/plan-items/fields"
import { flowFormStart } from "../../lib/view/plan-items/flow-try-draft"
import { categoriesOf, type FlowKind } from "../../lib/view/plan-items/flows"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { namedRefusal } from "../../lib/view/plan-items/refusal"
import { newIncomeTaxNote } from "../../lib/view/plan-items/tax-label"
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
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. A saved new income in a
	 * taxed plan also hands over the Tax labels page its label goes on. */
	onDone: (taxLabelHref?: string) => void
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
const start = () => flowFormStart(doc, name, existing, tryValue, whatIfSession.whatIf)
let draft = $state(start().draft)
let employer = $state(start().employer)
let problems: Problems = $state({})
/** The fields a tried value cleared, which a what-if cannot hold. */
let cleared: string[] = $state([])
/** Whether a cleared field left the Flow switched off, so the what-if holds no other change to point at. */
const keptOff = $derived(
	cleared.length > 0 && whatIfSession.isOffIn(name, `flows.${existing?.id ?? ""}`),
)
/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
let sent: string[] = $state([])
/** The Flow the form edits: its stored id, or the one the last save added. */
const savedId = $derived(
	existing?.id ?? sent.find((id) => !doc.flows.some((flow) => flow.id === id)),
)
const item = $derived(["flows", savedId ?? ""])
const employerPath = $derived(["flows", employerIdOf(savedId ?? "")])
const refusal = $derived(namedRefusal(editSession.failure, sent))
const shown = $derived(
	shownProblems(problems, refusal, editSession.error, FLOW_FIELDS, item, employerPath),
)
const note = $derived(newIncomeTaxNote(name, doc, kind, existing))
/** True while the form shows the note for a new income in a taxed plan, so the fields say what the save leaves undone. */
const needsTaxLabel = $derived(note !== null)

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
	if (saved.done) onDone(tryValue ? undefined : (note ?? undefined))
}

async function remove(): Promise<void> {
	if (await deleteFlow({ name, contentHash, doc }, existing?.id ?? "")) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${currentItemText("flow", existing.id)}` : `Add ${kind}`}>
	<FlowFields bind:draft bind:employer {kind} {existing} {shown} {name} {anchors} trying={tryValue} categories={categoriesOf(doc.flows)} targets={employerTargets(doc)} {needsTaxLabel} />
	<TryNotice fields={cleared} others={!keptOff} />
	<ItemActions id={existing?.id} kind="flow" onDelete={remove} trying={tryValue} note={existing === undefined ? undefined : salaryDeleteNote(doc.flows, existing.id)} />
</form>
