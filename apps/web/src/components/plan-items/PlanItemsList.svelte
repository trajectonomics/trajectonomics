<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { Baseline, HouseholdDocument, Read, ScenarioDocument } from "../../lib/contract"
import { accountCards } from "../../lib/view/plan-items/accounts"
import { flowCards } from "../../lib/view/plan-items/flows"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import Drawer from "../ui/Drawer.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import AccountCards from "./AccountCards.svelte"
import AccountForm from "./AccountForm.svelte"
import FlowCards from "./FlowCards.svelte"
import FlowForm from "./FlowForm.svelte"

interface Props {
	kind: PlanKind
	/** The plan the items belong to: the Edits save its document under this name. */
	name: string
	doc: ScenarioDocument
	/** The household of the plan, whose anchored dates the forms show as read-only. Null without one. */
	household: HouseholdDocument | null
	baseline: Read<Baseline>
	editable: boolean
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0051). */
	contentHash: string
}

let { kind, name, doc, household, baseline, editable, contentHash }: Props = $props()
/** The drawer: null when it is shut, else the item it edits, or no id for a new one. */
let drawer = $state<{ id?: string } | null>(null)

/** Opens or shuts the drawer. A refusal from an earlier save is forgotten, so it never shows on the next form. */
function setDrawer(next: { id?: string } | null): void {
	editSession.clear()
	drawer = next
}
const noun = $derived(PLAN_PAGES[kind].noun)
const editingId = $derived(drawer === null ? undefined : drawer.id)
const title = $derived(editingId === undefined ? `Add ${noun}` : `Edit ${editingId}`)
const flowKind = $derived(kind === "expense" ? "expense" : "income")
const cards = $derived(kind === "assets" ? [] : flowCards(doc.flows, flowKind, household))
const accounts = $derived(accountCards(doc.accounts, baseline))
const existingFlow = $derived(doc.flows.find((flow) => flow.id === editingId))
const existingAccount = $derived(doc.accounts.find((account) => account.id === editingId))
const busy = $derived(editSession.busy)
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground">Plan {name}</p>
		{#if editable}
			<button
				type="button"
				onclick={() => setDrawer({})}
				disabled={busy}
				class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
			>
				Add {noun}
			</button>
		{/if}
	</div>
	{#if kind === "assets"}
		{#if accounts.length === 0}
			<EmptyState title="No accounts in this plan" />
		{:else}
			<AccountCards cards={accounts} currency={doc.currency} {editable} onEdit={(id) => setDrawer({ id })} />
		{/if}
	{:else if cards.length === 0}
		<EmptyState title="No {noun} in this plan" />
	{:else}
		<FlowCards {cards} currency={doc.currency} {editable} onEdit={(id) => setDrawer({ id })} />
	{/if}
	<Drawer open={drawer !== null} {title} onClose={() => setDrawer(null)}>
		<StaleNotice />
		{#if drawer !== null && kind === "assets"}
			<AccountForm {name} {doc} {contentHash} existing={existingAccount} onDone={() => setDrawer(null)} />
		{:else if drawer !== null}
			<FlowForm kind={flowKind} {name} {doc} {household} {contentHash} existing={existingFlow} onDone={() => setDrawer(null)} />
		{/if}
	</Drawer>
</div>
