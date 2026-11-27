<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemNames } from "../../client/item-names.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type {
	Baseline,
	HouseholdDocument,
	ProjectionRun,
	Read,
	ScenarioDocument,
} from "../../lib/contract"
import { drawerEditsShown } from "../../lib/edit/shown"
import { assetCardsOf } from "../../lib/view/plan-items/asset-card"
import { assetsWithFlows } from "../../lib/view/plan-items/asset-link"
import { canEdit, type PlanDrawer } from "../../lib/view/plan-items/drawer"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import type { PlanDensity } from "../../lib/view/plan-items/tabs"
import { loanPage } from "../../lib/view/what-if/loan-items"
import { accountItems, flowItems } from "../../lib/view/what-if/plan-items"
import AssetsNote from "./AssetsNote.svelte"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import PlanItemFace from "./PlanItemFace.svelte"
import PlanItemsCards from "./PlanItemsCards.svelte"
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
	/** The page's full cards, or the Plan's compact grid. */
	density?: PlanDensity
}

let {
	kind,
	name,
	doc,
	household,
	baseline,
	run,
	editable,
	contentHash,
	density = "full",
}: Props = $props()
/** The drawer: null when it is shut, else what it is open on (an item, a form, a what-if try). */
let drawer = $state<PlanDrawer | null>(null)

/** Opens or shuts the drawer. A refusal from an earlier save is forgotten, so it never shows on the next form. */
function setDrawer(next: PlanDrawer | null): void {
	editSession.clear()
	drawer = next
}
const compact = $derived(density === "compact")
const noun = $derived(PLAN_PAGES[kind].noun)
const changes = $derived(whatIfSession.changesFor(name))
const flows = $derived(flowItems(doc, kind, household, changes, currentItemNames()))
const tried = $derived(whatIfSession.lensFor(name)?.run ?? undefined)
const accounts = $derived(accountItems(doc, baseline, changes, { run, tried }, currentItemNames()))
const assets = $derived(kind === "assets" ? assetCardsOf(doc, baseline, run) : [])
const loans = $derived(loanPage(kind, doc, { run, baseline }, changes))
const lists = $derived({ flows, accounts, assets, loans })
/** The open item can be edited here: the page edits, a drawer may show a form, and the card states the item is editable. */
const formShown = $derived(
	drawer === null ||
		drawer.details !== true ||
		(editable && drawerEditsShown() && canEdit(kind, drawer, lists)),
)
/** A compact card opens the item's full card first; a full page's Edit opens the form. */
const onEdit = (id: string) => setDrawer(compact ? { id, details: true } : { id })
const onTry = (id: string) => setDrawer({ id, tryValue: true })
</script>

{#snippet face()}
	{#if drawer !== null}
		<PlanItemFace {kind} {drawer} {lists} currency={doc.currency} editable={editable && drawerEditsShown()} plan={name} {contentHash} {onTry} />
	{/if}
{/snippet}

<div class="space-y-4">
	{#if editable && !compact}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<PlanToolbar {kind} {noun} open={setDrawer} />
		</div>
	{/if}
	<PlanItemsCards {kind} {flows} {accounts} {assets} {loans} currency={doc.currency} {editable} {density} plan={name} {contentHash} open={setDrawer} {onEdit} {onTry} onAdd={() => setDrawer({})} {noun} />
	<AssetsNote assets={kind === "assets" ? [] : assetsWithFlows(doc, kind)} plan={name} />
	<PlanItemDrawer {drawer} {kind} {name} {doc} {household} {baseline} {contentHash} onClose={() => setDrawer(null)} form={formShown} face={drawer?.details === true ? face : undefined} />
</div>
