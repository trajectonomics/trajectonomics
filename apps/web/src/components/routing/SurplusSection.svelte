<script lang="ts">
import { orderSource, removeSource, routing } from "../../client/routing.svelte.js"
import { formatMoney } from "../../lib/format"
import type { RoutingContext } from "../../lib/view/routing/context"
import { targetNote } from "../../lib/view/routing/echo"
import { filledFigure } from "../../lib/view/routing/figures"
import { sameOrder } from "../../lib/view/routing/order"
import { rowRefusal } from "../../lib/view/routing/shown"
import { lastStepProblem } from "../../lib/view/routing/surplus"
import { plainText, stepWords } from "../../lib/view/routing/words"
import ActionRefusal from "../ui/ActionRefusal.svelte"
import AddButton from "./AddButton.svelte"
import FigureChart from "./FigureChart.svelte"
import LockedNote from "./LockedNote.svelte"
import ReorderList from "./ReorderList.svelte"
import RoutingDrawer from "./RoutingDrawer.svelte"
import RowButtons from "./RowButtons.svelte"
import SectionFrame from "./SectionFrame.svelte"
import Sentence from "./Sentence.svelte"
import StepForm from "./StepForm.svelte"

interface Props {
	ctx: RoutingContext
}

let { ctx }: Props = $props()
let drawer = $state<{ index: number | null; trying: boolean } | null>(null)
let note: string | null = $state(null)
/** The steps as the session shows them, which the rows, the drawers that try and the figures read. */
const steps = $derived(ctx.shown.cashflow?.surplus ?? [])
const locked = $derived(!sameOrder(steps, ctx.doc.cashflow?.surplus ?? []))
const filled = $derived(ctx.run === undefined ? null : filledFigure(ctx.run, ctx.names))
const list = (items: readonly unknown[]) => ({ kind: "list", list: "surplus", items }) as const

/** Takes a step out, unless the step before it would then be last and take less than everything. True when it ran. */
function remove(index: number, trying: boolean): boolean | Promise<boolean> {
	const items = steps.filter((_, at) => at !== index)
	const rule = lastStepProblem(items)
	note = rule === null ? null : rule.message
	if (rule !== null) return false
	return trying
		? routing.tryIt(ctx, list(items))
		: routing.save(ctx, list(items), removeSource("surplus", index))
}
</script>

<SectionFrame id="surplus" title="When there is money left over" intro="Each year's leftover money goes down this list, one step at a time. The last step must take everything that is left.">
	{#key JSON.stringify(steps)}
	<ReorderList items={steps} {locked} editable={ctx.editable} busy={false} rule={lastStepProblem}
		labelOf={(step, order, at) => plainText(stepWords(step, at, order.length, ctx.names), formatMoney)}
		refused={(at) => (drawer === null ? rowRefusal(routing.place, routing.message, "surplus", at) : undefined)}
		onSave={(order) => routing.save(ctx, list(order), orderSource("surplus"))} onTry={(order) => void routing.tryIt(ctx, list(order))}>
		{#snippet row(step, at, order)}
			<Sentence parts={stepWords(step, at, order.length, ctx.names)} currency={ctx.doc.currency} />
			{#if sameOrder(order, steps)}
				{@const echo = targetNote(ctx.run, "surplus", at)}
				{#if echo}<span class="block text-xs text-muted-foreground"><Sentence parts={echo} currency={ctx.doc.currency} /></span>{/if}
			{/if}
		{/snippet}
		{#snippet buttons(_step, saved, shown)}
			<RowButtons label={`step ${shown + 1}`} busy={false} {locked} onEdit={() => (drawer = { index: saved, trying: false })}
				onTry={() => (drawer = { index: saved, trying: true })} onRemove={() => remove(saved, false)} onTryRemove={() => remove(saved, true)} />
			<ActionRefusal source={removeSource("surplus", saved)} onRow={routing.onRow(ctx)} />
		{/snippet}
		{#snippet refusal()}<ActionRefusal source={orderSource("surplus")} onRow={routing.onRow(ctx)} />{/snippet}
	</ReorderList>
	{/key}
	<LockedNote {locked} />
	{#if note}<p role="alert" class="text-sm text-destructive">{note}</p>{/if}
	{#if ctx.editable}<AddButton label="Add a step" onclick={() => (drawer = { index: null, trying: locked })} />{/if}
	{#snippet figure()}<FigureChart label="Money each step filled, by year" figure={filled} empty="No step filled an account in this run." />{/snippet}
</SectionFrame>
<RoutingDrawer open={drawer !== null} title={drawer?.index === null ? "Add a step" : "Change a step"} onClose={() => (drawer = null)}>
	{#if drawer !== null}<StepForm {ctx} index={drawer.index} tryValue={drawer.trying} onDone={() => (drawer = null)} />{/if}
</RoutingDrawer>
