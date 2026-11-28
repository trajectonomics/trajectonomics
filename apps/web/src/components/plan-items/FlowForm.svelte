<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { deleteFlow, saveFlow } from "../../client/flow-save.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { flowOwner, ownerChoices } from "../../lib/view/household/owner"
import { employerTargets, salaryDeleteNote } from "../../lib/view/plan-items/employer"
import { flowShown } from "../../lib/view/plan-items/flow-shown"
import { flowFormStart } from "../../lib/view/plan-items/flow-try-draft"
import { categoriesOf, type FlowKind } from "../../lib/view/plan-items/flows"
import type { Problems } from "../../lib/view/plan-items/problems"
import { newIncomeNeedsTaxLabel } from "../../lib/view/plan-items/tax-label"
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
	/** Runs once the save has run. A new income in a taxed plan hands over the Flow that needs a tax label. */
	onDone: (taxLabelFlow?: string) => void
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
/** The Flow the last save added: the form edits it from then on, so a second Save adds no other one. */
let addedId: string | undefined = $state()
const held = $derived(existing ?? doc.flows.find((flow) => flow.id === addedId))
const anchors = $derived(flowAnchorLabels(household, held?.id ?? ""))
/** The Owner the household holds for the Flow, and the choices of the Owner field, which only a save writes. */
const storedOwner = $derived(flowOwner(household, held?.id ?? ""))
// svelte-ignore state_referenced_locally
let owner = $state(flowOwner(household, existing?.id ?? ""))
const owners = $derived(
	kind === "income" && !tryValue ? ownerChoices(household, storedOwner) : undefined,
)
const start = () => flowFormStart(doc, name, existing, tryValue, whatIfSession.whatIf)
let draft = $state(start().draft)
let employer = $state(start().employer)
let problems: Problems = $state({})
/** The fields a tried value cleared, which a what-if cannot hold. */
let cleared: string[] = $state([])
const keptOff = $derived(
	cleared.length > 0 && whatIfSession.isOffIn(name, `flows.${existing?.id ?? ""}`),
)
/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
let sent: string[] = $state([])
const shown = $derived(
	flowShown(
		{ problems, failure: editSession.failure, message: editSession.error, sent },
		{ held: held?.id, flows: doc.flows },
	),
)
const needsTaxLabel = $derived(newIncomeNeedsTaxLabel(doc, kind, existing))

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const saved = await saveFlow({
		name,
		contentHash,
		doc,
		kind,
		existing: held,
		draft,
		employer,
		tryValue,
		owner: owners === undefined || owner === storedOwner ? undefined : owner,
	})
	problems = saved.problems
	cleared = saved.cleared
	sent = saved.sent
	addedId = saved.added ?? addedId
	if (saved.done) onDone(tryValue || !needsTaxLabel ? undefined : addedId)
}

async function remove(): Promise<void> {
	if (await deleteFlow({ name, contentHash, doc }, held?.id ?? "")) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={held ? `Edit ${currentItemText("flow", held.id)}` : `Add ${kind}`}>
	<FlowFields bind:draft bind:employer bind:owner {owners} {kind} existing={held} {shown} {name} {anchors} trying={tryValue} categories={categoriesOf(doc.flows)} targets={employerTargets(doc)} {needsTaxLabel} />
	<TryNotice fields={cleared} others={!keptOff} />
	<ItemActions id={held?.id} kind="flow" onDelete={remove} trying={tryValue} note={held === undefined ? undefined : salaryDeleteNote(doc.flows, held.id)} />
</form>
