<script lang="ts">
import type { HouseholdDocument, ScenarioDocument } from "../../lib/contract"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import AccountForm from "./AccountForm.svelte"
import FlowForm from "./FlowForm.svelte"

interface Props {
	/** Null when the drawer is shut; else the item it edits (no id for a new one), and whether it tries a value. */
	drawer: { id?: string; tryValue?: boolean } | null
	kind: PlanKind
	name: string
	doc: ScenarioDocument
	household: HouseholdDocument | null
	contentHash: string
	onClose: () => void
}

let { drawer, kind, name, doc, household, contentHash, onClose }: Props = $props()
const noun = $derived(PLAN_PAGES[kind].noun)
const editingId = $derived(drawer?.id)
const trying = $derived(drawer?.tryValue === true)
const title = $derived(
	editingId === undefined
		? `Add ${noun}`
		: trying
			? `Try a value for ${editingId}`
			: `Edit ${editingId}`,
)
const flowKind = $derived(kind === "expense" ? "expense" : "income")
const existingFlow = $derived(doc.flows.find((flow) => flow.id === editingId))
const existingAccount = $derived(doc.accounts.find((account) => account.id === editingId))
</script>

<!-- The item drawer: one form per item, which saves it as an Edit, or tries a value in the What-if session. -->
<Drawer open={drawer !== null} {title} {onClose}>
	<StaleNotice />
	{#if drawer !== null && kind === "assets"}
		<AccountForm {name} {doc} {contentHash} existing={existingAccount} tryValue={trying} onDone={onClose} />
	{:else if drawer !== null}
		<FlowForm kind={flowKind} {name} {doc} {household} {contentHash} existing={existingFlow} tryValue={trying} onDone={onClose} />
	{/if}
</Drawer>
