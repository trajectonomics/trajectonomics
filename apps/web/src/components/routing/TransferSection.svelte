<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { routing } from "../../client/routing.svelte.js"
import type { ScenarioFlow } from "../../lib/contract"
import { formatMoney } from "../../lib/format"
import type { RoutingContext } from "../../lib/view/routing/context"
import { movedFigure } from "../../lib/view/routing/figures"
import { transferWords } from "../../lib/view/routing/transfer-words"
import { plainText } from "../../lib/view/routing/words"
import AddButton from "./AddButton.svelte"
import FigureChart from "./FigureChart.svelte"
import RoutingDrawer from "./RoutingDrawer.svelte"
import RowButtons from "./RowButtons.svelte"
import SectionFrame from "./SectionFrame.svelte"
import Sentence from "./Sentence.svelte"
import TransferForm from "./TransferForm.svelte"

interface Props {
	ctx: RoutingContext
}

let { ctx }: Props = $props()
const items = $derived(currentItemNames())
let drawer = $state<{ id: string | null; trying: boolean } | null>(null)
const moves = (flows: readonly ScenarioFlow[]) => flows.filter((flow) => flow.kind === "transfer")
const stored = $derived(moves(ctx.doc.flows))
/** The moves the What-if session adds, which the plan does not hold yet. */
const tried = $derived(
	moves(ctx.shown.flows).filter((flow) => !stored.some((one) => one.id === flow.id)),
)
const moved = $derived(ctx.run === undefined ? null : movedFigure(ctx.run))
/** The move the open drawer works on: as the session shows it while a value is tried, else as stored. */
const existing = $derived(
	(drawer?.trying ? ctx.shown : ctx.doc).flows.find((flow) => flow.id === drawer?.id),
)
const remove = (id: string) => ({ kind: "remove", id }) as const
</script>

<SectionFrame id="moves" title="Planned moves between your accounts" intro="Money moved from one of your accounts to another, or to pay a loan down. A move is not income, spending or saving, so it never changes your net worth.">
	<ul class="space-y-2">
		{#each [...stored, ...tried] as flow (flow.id)}
			{@const isTried = tried.includes(flow)}
			<li class="space-y-2 rounded-md border border-border bg-card p-3 text-sm">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="wrap-anywhere min-w-0 flex-1"><Sentence parts={transferWords(flow, ctx.names, items)} currency={ctx.doc.currency} />{isTried ? " (tried)" : ""}</span>
					{#if ctx.editable}
						<span class="flex flex-wrap gap-1.5">
							<RowButtons label={plainText(transferWords(flow, ctx.names, items), formatMoney)} busy={false}
								onEdit={() => (drawer = { id: flow.id, trying: isTried })} onTry={() => (drawer = { id: flow.id, trying: true })}
								onRemove={() => (isTried ? routing.tryIt(ctx, remove(flow.id)) : routing.save(ctx, remove(flow.id)))}
								onTryRemove={() => routing.tryIt(ctx, remove(flow.id))} />
						</span>
					{/if}
				</div>
				{#if routing.place?.kind === "flow" && routing.place.id === flow.id && drawer === null && routing.message}
					<p role="alert" class="text-sm text-destructive" data-cli={routing.messageFromCli ? "" : undefined}>{routing.message}</p>
				{/if}
			</li>
		{:else}
			<li class="text-sm text-muted-foreground">No planned moves.</li>
		{/each}
	</ul>
	{#if ctx.editable}<AddButton label="Add a move" onclick={() => (drawer = { id: null, trying: false })} />{/if}
	{#snippet figure()}<FigureChart label="Money moved between accounts, by year" figure={moved} empty="No money moved between accounts in this run." />{/snippet}
</SectionFrame>
<RoutingDrawer open={drawer !== null} title={drawer?.id === null ? "Add a move" : "Change a move"} onClose={() => (drawer = null)}>
	{#if drawer !== null}<TransferForm {ctx} {existing} tryValue={drawer.trying} onDone={() => (drawer = null)} />{/if}
</RoutingDrawer>
