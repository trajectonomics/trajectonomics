<script lang="ts">
import { routing } from "../../client/routing.svelte.js"
import { formatMoney } from "../../lib/format"
import { ILLIQUID_NOTE } from "../../lib/view/routing/accounts"
import type { RoutingContext } from "../../lib/view/routing/context"
import { targetNote } from "../../lib/view/routing/echo"
import { drawnFigure } from "../../lib/view/routing/figures"
import { sameOrder } from "../../lib/view/routing/order"
import { rowRefusal } from "../../lib/view/routing/shown"
import { strandedFloors } from "../../lib/view/routing/withdraw"
import { entryWords, plainText } from "../../lib/view/routing/words"
import AddButton from "./AddButton.svelte"
import EntryForm from "./EntryForm.svelte"
import FigureChart from "./FigureChart.svelte"
import ReorderList from "./ReorderList.svelte"
import RoutingDrawer from "./RoutingDrawer.svelte"
import RowButtons from "./RowButtons.svelte"
import SectionFrame from "./SectionFrame.svelte"
import Sentence from "./Sentence.svelte"

interface Props {
	ctx: RoutingContext
}

let { ctx }: Props = $props()
let drawer = $state<{ index: number | null; trying: boolean } | null>(null)
const entries = $derived(ctx.doc.cashflow?.withdraw ?? [])
const drawn = $derived(
	ctx.run === undefined
		? null
		: drawnFigure(ctx.run, ctx.shown.cashflow?.withdraw ?? entries, ctx.names),
)
const list = (items: readonly unknown[]) => ({ kind: "list", list: "withdraw", items }) as const
const without = (index: number) => list(entries.filter((_, at) => at !== index))
</script>

<SectionFrame id="withdraw" title="When money is short" intro={`When spending is more than comes in, money is taken from the accounts in this order. A floor keeps a reserve in an account until the entries after it are used. ${ILLIQUID_NOTE}`}>
	<ReorderList items={entries} editable={ctx.editable} busy={false} rule={() => null}
		labelOf={(_entry, order, at) => plainText(entryWords(order, at, ctx.names), formatMoney)}
		refused={(at) => (drawer === null ? rowRefusal(routing.place, routing.message, "withdraw", at) : undefined)}
		onSave={(order) => routing.save(ctx, list(order))} onTry={(order) => void routing.tryIt(ctx, list(order))}>
		{#snippet row(_entry, at, order)}
			<Sentence parts={entryWords(order, at, ctx.names)} currency={ctx.doc.currency} />
			{#if sameOrder(order, entries)}
				{@const echo = targetNote(ctx.run, "withdraw", at)}
				{#if echo}<span class="block text-xs text-muted-foreground"><Sentence parts={echo} currency={ctx.doc.currency} /></span>{/if}
			{/if}
			{#if strandedFloors(order).includes(at)}
				<span class="block text-xs text-muted-foreground">No later entry takes the rest of this account, so the money under its floor is never used.</span>
			{/if}
		{/snippet}
		{#snippet buttons(_entry, at)}
			<RowButtons label={`entry ${at + 1}`} busy={false} onEdit={() => (drawer = { index: at, trying: false })}
				onTry={() => (drawer = { index: at, trying: true })} onRemove={() => routing.save(ctx, without(at))} onTryRemove={() => routing.tryIt(ctx, without(at))} />
		{/snippet}
	</ReorderList>
	{#if ctx.editable}<AddButton label="Add an entry" onclick={() => (drawer = { index: null, trying: false })} />{/if}
	{#snippet figure()}<FigureChart label="Money each entry drew, by year" figure={drawn} empty="Nothing was drawn from an account in this run." />{/snippet}
</SectionFrame>
<RoutingDrawer open={drawer !== null} title={drawer?.index === null ? "Add an entry" : "Change an entry"} onClose={() => (drawer = null)}>
	{#if drawer !== null}<EntryForm {ctx} index={drawer.index} tryValue={drawer.trying} onDone={() => (drawer = null)} />{/if}
</RoutingDrawer>
