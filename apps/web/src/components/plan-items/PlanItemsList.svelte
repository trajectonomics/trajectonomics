<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { Baseline, HouseholdDocument, Read, ScenarioDocument } from "../../lib/contract"
import { PLAN_PAGES, type PlanKind } from "../../lib/view/plan-items/kinds"
import { loanCards } from "../../lib/view/plan-items/loans"
import { accountItems, flowItems } from "../../lib/view/what-if/plan-items"
import EmptyState from "../ui/EmptyState.svelte"
import AccountCards from "./AccountCards.svelte"
import FlowCards from "./FlowCards.svelte"
import LoanCards from "./LoanCards.svelte"
import PlanItemDrawer from "./PlanItemDrawer.svelte"

interface Props {
	kind: PlanKind
	/** The plan the items belong to: the Edits save its document under this name. */
	name: string
	doc: ScenarioDocument
	/** The household of the plan, whose anchored dates the forms show as read-only. Null without one. */
	household: HouseholdDocument | null
	baseline: Read<Baseline>
	editable: boolean
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
}

let { kind, name, doc, household, baseline, editable, contentHash }: Props = $props()
/**
 * The drawer: null when it is shut, else the item it edits (or no id for a new one), and whether it tries a
 * value in the What-if session rather than saving one.
 */
let drawer = $state<{ id?: string; tryValue?: boolean } | null>(null)

/** Opens or shuts the drawer. A refusal from an earlier save is forgotten, so it never shows on the next form. */
function setDrawer(next: { id?: string; tryValue?: boolean } | null): void {
	editSession.clear()
	drawer = next
}
const noun = $derived(PLAN_PAGES[kind].noun)
const changes = $derived(whatIfSession.changesFor(name))
const flows = $derived(flowItems(doc, kind, household, changes))
const accounts = $derived(accountItems(doc, baseline, changes))
const loans = $derived(kind === "assets" ? loanCards(doc.flows) : [])
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
		{#if accounts.cards.length === 0}
			<EmptyState title="No accounts in this plan" />
		{:else}
			<AccountCards
			cards={accounts.cards}
			marks={accounts.marks}
			currency={doc.currency}
			{editable}
			plan={name}
			{contentHash}
			onEdit={(id) => setDrawer({ id })}
			onTry={(id) => setDrawer({ id, tryValue: true })}
		/>
		{/if}
		{#if loans.length > 0}
			<LoanCards cards={loans} currency={doc.currency} />
		{/if}
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
	<PlanItemDrawer
		{drawer}
		{kind}
		{name}
		{doc}
		{household}
		{contentHash}
		onClose={() => setDrawer(null)}
	/>
</div>
