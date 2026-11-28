<script lang="ts">
import { routing } from "../../client/routing.svelte.js"
import type { ScenarioFlow } from "../../lib/contract"
import { type Problems } from "../../lib/view/plan-items/problems"
import {
	accountOptions,
	ILLIQUID_NOTE,
	routableAccounts,
	transferTargets,
} from "../../lib/view/routing/accounts"
import { type RoutingContext, transferContext } from "../../lib/view/routing/context"
import { MOVE_CHOICES, REALISE_WORDS } from "../../lib/view/routing/options"
import { shownForFlow } from "../../lib/view/routing/shown"
import { transferFromDraft } from "../../lib/view/routing/transfer-build"
import { transferDraftOf } from "../../lib/view/routing/transfer-draft"
import Field from "../plan-items/Field.svelte"
import ItemActions from "../plan-items/ItemActions.svelte"
import TargetFields from "./TargetFields.svelte"
import TransferWhen from "./TransferWhen.svelte"

interface Props {
	ctx: RoutingContext
	/** The transfer to change, as the plan or the session shows it; absent for a new one. */
	existing?: ScenarioFlow | undefined
	tryValue: boolean
	onDone: () => void
}

let { ctx, existing, tryValue, onDone }: Props = $props()
const around = $derived(transferContext(ctx))
const initial = () => transferDraftOf(existing, transferContext(ctx))
let draft = $state(initial())
let problems: Problems = $state({})
let sentId: string | null = $state(null)
const shown = $derived(shownForFlow(problems, routing.place, routing.formMessage, sentId))
const from = $derived(
	accountOptions(
		routableAccounts(ctx.doc, ctx.names),
		draft.source,
		ctx.names,
		"Choose an account",
	),
)
const to = $derived(
	accountOptions(
		transferTargets(ctx.doc, ctx.names, draft.source),
		draft.target,
		ctx.names,
		"Choose an account or loan",
	),
)

async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	routing.clear()
	const taken = ctx.shown.flows.map((flow) => flow.id)
	const made = transferFromDraft(draft, { existing, taken, ctx: around })
	problems = made.ok ? {} : made.problems
	if (!made.ok) return
	sentId = made.flow.id
	const change = { kind: "transfer", flow: made.flow } as const
	if (tryValue ? routing.tryIt(ctx, change) : await routing.save(ctx, change)) onDone()
}
</script>

<form onsubmit={submit} class="space-y-5" aria-label={existing === undefined ? "Add a move" : "Change a move"}>
	<Field id="move-source" label="Move from" hint={ILLIQUID_NOTE} options={from} bind:value={draft.source} problem={shown.at("source")} />
	<Field id="move-target" label="Move to" hint="An account, or a loan to pay down." options={to} bind:value={draft.target} problem={shown.at("target")} />
	<Field id="move-how" label="How much" options={MOVE_CHOICES} bind:value={draft.how} />
	{#if draft.how === "share"}
		<Field id="move-share" label="Share of what it holds" inputmode="decimal" hint="A percent with at most two places, such as 10" bind:value={draft.share} problem={shown.at("share")} />
	{:else if draft.how === "amount"}
		<TargetFields bind:draft id="move" label="Amount each time" problem={shown.at("amount")} rateProblem={shown.at("rate")} />
	{/if}
	<TransferWhen bind:draft ctx={around} {shown} />
	<label class="flex items-start gap-2 text-sm text-foreground">
		<input type="checkbox" bind:checked={draft.realise} class="mt-0.5 size-4" />
		<span>Count any gain for tax<span class="mt-1 block text-xs text-muted-foreground">{REALISE_WORDS}</span></span>
	</label>
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<ItemActions kind="flow" trying={tryValue} />
</form>
