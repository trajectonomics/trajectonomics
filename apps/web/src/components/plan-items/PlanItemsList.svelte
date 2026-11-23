<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type {
	Baseline,
	HouseholdDocument,
	ProjectionRun,
	Read,
	ScenarioDocument,
} from "../../lib/contract"
import { accountCards } from "../../lib/view/plan-items/accounts"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import { flowCards } from "../../lib/view/plan-items/flows"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import { loanCardsOf, unplacedFlows } from "../../lib/view/plan-items/loan-card"
import { loanCards } from "../../lib/view/plan-items/loans"
import EmptyState from "../ui/EmptyState.svelte"
import AssetItems from "./AssetItems.svelte"
import FlowCards from "./FlowCards.svelte"
import PlanItemDrawer from "./PlanItemDrawer.svelte"

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
const cards = $derived(
	kind === "assets"
		? []
		: flowCards(doc.flows, kind === "expense" ? "expense" : "income", household),
)
const accounts = $derived(accountCards(doc.accounts, baseline))
const loans = $derived(kind === "assets" ? loanCardsOf(doc, run) : [])
const other = $derived(kind === "assets" ? loanCards(unplacedFlows(doc)) : [])
const busy = $derived(editSession.busy)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground">Plan {name}</p>
		{#if editable}
			<div class="flex flex-wrap gap-2">
				<button type="button" onclick={() => setDrawer({})} disabled={busy} class={button}>Add {noun}</button>
				{#if kind === "assets"}
					<button type="button" onclick={() => setDrawer({ loan: true })} disabled={busy} class={button}>Add loan</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if kind === "assets"}
		<AssetItems {accounts} {loans} {other} currency={doc.currency} {editable} plan={name} {contentHash} open={setDrawer} />
	{:else if cards.length === 0}
		<EmptyState title="No {noun} in this plan" />
	{:else}
		<FlowCards
			{cards}
			currency={doc.currency}
			{editable}
			plan={name}
			{contentHash}
			onEdit={(id) => setDrawer({ id })}
			onTry={(id) => setDrawer({ id, tryValue: true })}
		/>
	{/if}
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
