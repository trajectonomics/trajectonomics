<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { Baseline, Read, ScenarioDocument } from "../../lib/contract"
import { accountCards } from "../../lib/view/plan-items/accounts"
import { flowCards } from "../../lib/view/plan-items/flows"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import Drawer from "../ui/Drawer.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import AccountCards from "./AccountCards.svelte"
import AccountForm from "./AccountForm.svelte"
import FlowCards from "./FlowCards.svelte"
import FlowForm from "./FlowForm.svelte"

interface Props {
	kind: PlanKind
	/** The plan the items belong to: the Edits save its document under this name. */
	name: string
	doc: ScenarioDocument
	baseline: Read<Baseline>
	editable: boolean
}

let { kind, name, doc, baseline, editable }: Props = $props()
/** The drawer: null when it is shut, else the item it edits, or no id for a new one. */
let drawer = $state<{ id?: string } | null>(null)
const noun = $derived(PLAN_PAGES[kind].noun)
const editingId = $derived(drawer === null ? undefined : drawer.id)
const title = $derived(editingId === undefined ? `Add ${noun}` : `Edit ${editingId}`)
const flowKind = $derived(kind === "expense" ? "expense" : "income")
const cards = $derived(kind === "assets" ? [] : flowCards(doc.flows, flowKind))
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
				onclick={() => (drawer = {})}
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
			<AccountCards cards={accounts} currency={doc.currency} {editable} onEdit={(id) => (drawer = { id })} />
		{/if}
	{:else if cards.length === 0}
		<EmptyState title="No {noun} in this plan" />
	{:else}
		<FlowCards {cards} currency={doc.currency} {editable} onEdit={(id) => (drawer = { id })} />
	{/if}
	<Drawer open={drawer !== null} {title} onClose={() => (drawer = null)}>
		{#if drawer !== null && kind === "assets"}
			<AccountForm {name} {doc} existing={existingAccount} onDone={() => (drawer = null)} />
		{:else if drawer !== null}
			<FlowForm kind={flowKind} {name} {doc} existing={existingFlow} onDone={() => (drawer = null)} />
		{/if}
	</Drawer>
</div>
