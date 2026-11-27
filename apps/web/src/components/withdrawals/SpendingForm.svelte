<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemNames, currentItemText } from "../../client/item-names.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument } from "../../lib/contract"
import { flowAnchorLabels } from "../../lib/view/household/model"
import { withoutFlow } from "../../lib/view/plan-items/document"
import type { Problems } from "../../lib/view/plan-items/problems"
import {
	milestoneIds,
	portfolioChoices,
	stoppableExpenses,
	type WithdrawalContext,
} from "../../lib/view/withdrawals/context"
import { draftOf } from "../../lib/view/withdrawals/draft"
import { prepareWithdrawal, triedFlows } from "../../lib/view/withdrawals/plan"
import { layoutOf, withdrawalShown } from "../../lib/view/withdrawals/refusal"
import { WITHDRAWAL_ID } from "../../lib/view/withdrawals/rule"
import ItemActions from "../plan-items/ItemActions.svelte"
import HowFields from "./HowFields.svelte"
import PortfolioFields from "./PortfolioFields.svelte"
import RuleFields from "./RuleFields.svelte"
import StartFields from "./StartFields.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which the Edit names (cli ADR 0055). */
	contentHash: string
	ctx: WithdrawalContext
	household: HouseholdDocument | null
	/** The Flow to edit by its id; absent for a new one, which takes the conventional id. */
	flowId?: string | undefined
	onDone: () => void
}

let { name, contentHash, ctx, household, flowId, onDone }: Props = $props()
const existing = $derived(ctx.doc.flows.find((flow) => flow.id === flowId))
const initial = () => draftOf(existing, ctx)
let draft = $state(initial())
let problems: Problems = $state({})
const noLayout = () => layoutOf(ctx.doc, flowId ?? WITHDRAWAL_ID, [])
let layout = $state(noLayout())
const shown = $derived(withdrawalShown(problems, editSession.failure, editSession.error, layout))
const stoppable = $derived(stoppableExpenses(ctx, draft, existing?.id ?? WITHDRAWAL_ID))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** The next document for the draft, or the problems at its fields (shown, nothing sent). */
function prepare() {
	const result = prepareWithdrawal(draft, ctx, existing)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	return result.ok ? result : null
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = prepare()
	if (result === null) return
	layout = result.layout
	const sent = { kind: "apply-plan", name, contentHash, document: result.document } as const
	if (await editSession.run(sent)) onDone()
}

/** Tries the draft in the What-if session: the plan is not written, and every figure page shows both. */
function tryIt(): void {
	const result = prepare()
	if (result === null) return
	const tried = triedFlows(ctx.doc, result.document, household, currentItemNames())
	if (!tried.ok) {
		problems = { general: tried.note }
		return
	}
	for (const one of tried.flows) whatIfSession.tryFlow(name, contentHash, one)
	onDone()
}

async function remove(): Promise<void> {
	if (existing === undefined) return
	if (
		await editSession.run({
			kind: "apply-plan",
			name,
			contentHash,
			document: withoutFlow(ctx.doc, existing.id),
		})
	)
		onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${currentItemText("flow", existing.id)}` : "Set how you spend in retirement"}>
	<HowFields bind:draft {shown} />
	{#if draft.how !== ""}
		<RuleFields bind:draft {shown} />
		<StartFields bind:draft {shown} milestones={milestoneIds(ctx.doc)} plan={name} anchor={flowAnchorLabels(household, existing?.id ?? "").start} {stoppable} />
		{#if draft.how !== "level"}<PortfolioFields bind:chosen={draft.portfolio} choices={portfolioChoices(ctx)} {shown} />{/if}
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<button type="button" class={button} disabled={editSession.busy || whatIfSession.saving} onclick={tryIt}>Try as a what-if</button>
	<ItemActions id={existing?.id} kind="flow" onDelete={remove} />
</form>
