<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type {
	Baseline,
	HouseholdDocument,
	ProjectionRun,
	Read,
	ScenarioDocument,
} from "../../lib/contract"
import { assetCardsOf } from "../../lib/view/plan-items/asset-card"
import { assetsWithFlows } from "../../lib/view/plan-items/asset-link"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import { loanPage } from "../../lib/view/what-if/loan-items"
import { accountItems, flowItems } from "../../lib/view/what-if/plan-items"
import EmptyState from "../ui/EmptyState.svelte"
import AssetItems from "./AssetItems.svelte"
import AssetsNote from "./AssetsNote.svelte"
import FlowCards from "./FlowCards.svelte"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import PlanToolbar from "./PlanToolbar.svelte"

interface Props {
	kind: PlanKind
	/** The plan the items belong to: the Edits save its document under this name. */
	name: string
	doc: ScenarioDocument
	/** The household of the plan, whose anchored dates the forms show as read-only. Null without one. */
	household: HouseholdDocument | null
	baseline: Read<Baseline>
	/** The plan's Projection run, which states each loan's statement (cli ADR 0059). Undefined when not read. */
	run?: ProjectionRun | undefined
	editable: boolean
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
}

let { kind, name, doc, household, baseline, run, editable, contentHash }: Props = $props()
/** The drawer: null when it is shut, else what it is open on (an item, a form, a what-if try). */
let drawer = $state<PlanDrawer | null>(null)

/** Opens or shuts the drawer. A refusal from an earlier save is forgotten, so it never shows on the next form. */
function setDrawer(next: PlanDrawer | null): void {
	editSession.clear()
	drawer = next
}
const noun = $derived(PLAN_PAGES[kind].noun)
const changes = $derived(whatIfSession.changesFor(name))
const flows = $derived(flowItems(doc, kind, household, changes, currentAccountNames()))
const tried = $derived(whatIfSession.lensFor(name)?.run ?? undefined)
const accounts = $derived(accountItems(doc, baseline, changes, { run, tried }))
const assets = $derived(kind === "assets" ? assetCardsOf(doc, baseline, run) : [])
const loans = $derived(loanPage(kind, doc, { run, baseline }, changes))
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground">Plan {name}</p>
		{#if editable}
			<PlanToolbar {kind} {noun} open={setDrawer} />
		{/if}
	</div>
	{#if kind === "assets"}
		<AssetItems
			accounts={accounts.cards}
			marks={accounts.marks}
			{assets}
			loans={loans.cards}
			loanMarks={loans.marks}
			other={loans.other}
			currency={doc.currency}
			{editable}
			plan={name}
			{contentHash}
			open={setDrawer}
		/>
	{:else if flows.cards.length === 0}
		<EmptyState title="No {noun} in this plan" />
	{:else}
		<FlowCards
			cards={flows.cards}
			marks={flows.marks}
			currency={doc.currency}
			{editable}
			plan={name}
			{contentHash}
			onEdit={(id) => setDrawer({ id })}
			onTry={(id) => setDrawer({ id, tryValue: true })}
		/>
	{/if}
	<AssetsNote assets={kind === "assets" ? [] : assetsWithFlows(doc, kind)} plan={name} />
	<PlanItemDrawer
		{drawer}
		{kind}
		{name}
		{doc}
		{household}
		{baseline}
		{contentHash}
		onClose={() => setDrawer(null)}
	/>
</div>
