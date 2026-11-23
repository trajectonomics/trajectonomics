<script lang="ts">
import type { Baseline, HouseholdDocument, Read, ScenarioDocument } from "../../lib/contract"
import { drawerTitle, type PlanDrawer } from "../../lib/view/plan-items/drawer"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import AccountForm from "./AccountForm.svelte"
import AssetForm from "./AssetForm.svelte"
import ExtraPaymentForm from "./ExtraPaymentForm.svelte"
import FlowForm from "./FlowForm.svelte"
import LoanForm from "./LoanForm.svelte"

interface Props {
	/** Null when the drawer is shut; else what it is open on. */
	drawer: PlanDrawer | null
	kind: PlanKind
	name: string
	doc: ScenarioDocument
	household: HouseholdDocument | null
	/** The Baseline, which a loan form shows the balance of an Account from. */
	baseline: Read<Baseline>
	contentHash: string
	onClose: () => void
}

let { drawer, kind, name, doc, household, baseline, contentHash, onClose }: Props = $props()
const title = $derived(drawer === null ? "" : drawerTitle(drawer, PLAN_PAGES[kind].noun))
const trying = $derived(drawer?.tryValue === true)
const flowKind = $derived(kind === "expense" ? "expense" : "income")
const existingFlow = $derived(doc.flows.find((flow) => flow.id === drawer?.id))
const existingAccount = $derived(doc.accounts.find((account) => account.id === drawer?.id))
</script>

<!-- The item drawer: one form per item, which saves it as an Edit, or tries a value in the What-if session. -->
<Drawer open={drawer !== null} {title} {onClose}>
	<StaleNotice />
	{#if drawer !== null && kind === "assets"}
		{#if drawer.extra === true && drawer.id !== undefined}
			<ExtraPaymentForm {name} {doc} {contentHash} loanId={drawer.id} onDone={onClose} />
		{:else if drawer.asset === true}
			<AssetForm {name} {doc} {household} {baseline} {contentHash} assetId={drawer.id} tryValue={trying} onDone={onClose} />
		{:else if drawer.loan === true}
			<LoanForm {name} {doc} {baseline} {contentHash} loanId={drawer.id} tryValue={trying} onDone={onClose} />
		{:else}
			<AccountForm {name} {doc} {contentHash} existing={existingAccount} tryValue={trying} onDone={onClose} />
		{/if}
	{:else if drawer !== null}
		<FlowForm kind={flowKind} {name} {doc} {household} {contentHash} existing={existingFlow} tryValue={trying} onDone={onClose} />
	{/if}
</Drawer>
