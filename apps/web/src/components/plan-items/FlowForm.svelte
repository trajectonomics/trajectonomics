<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { flowIds, withFlow, withoutFlow } from "../../lib/view/plan-items/document"
import { flowFromDraft } from "../../lib/view/plan-items/flow-draft"
import { type FlowKind, flowDraftOf } from "../../lib/view/plan-items/flows"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { recordOf } from "../../lib/what-if/session"
import FlowFields from "./FlowFields.svelte"
import ItemActions from "./ItemActions.svelte"

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
let problems: Problems = $state({})
const FIELDS = ["name", "amount", "frequency", "start", "end", "growth", "rate", "earned"]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))

/** Saves the plan's document with one change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument): Promise<void> {
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = flowFromDraft(draft, { kind, existing, taken: flowIds(doc) })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	if (tryValue) {
		// A what-if: each changed field is a Set of the session, and the plan itself is not written.
		if (existing !== undefined) {
			whatIfSession.tryItem(
				name,
				contentHash,
				"flows",
				existing.id,
				recordOf(existing),
				recordOf(result.flow),
			)
		}
		onDone()
		return
	}
	await commit(withFlow(doc, result.flow))
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : `Add ${kind}`}>
	<FlowFields bind:draft {kind} {existing} {shown} {name} {anchors} />
	<ItemActions id={existing?.id} onDelete={() => commit(withoutFlow(doc, existing?.id ?? ""))} trying={tryValue} />
</form>
