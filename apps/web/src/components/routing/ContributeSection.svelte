<script lang="ts">
import { routing } from "../../client/routing.svelte.js"
import { nameOf } from "../../lib/view/routing/accounts"
import type { RoutingContext } from "../../lib/view/routing/context"
import { savedFigure } from "../../lib/view/routing/figures"
import { rowRefusal } from "../../lib/view/routing/shown"
import FigureChart from "./FigureChart.svelte"
import ReorderList from "./ReorderList.svelte"
import SectionFrame from "./SectionFrame.svelte"

interface Props {
	ctx: RoutingContext
}

let { ctx }: Props = $props()
const listed = $derived(ctx.doc.cashflow?.contribute ?? [])
const saved = $derived(ctx.run === undefined ? null : savedFigure(ctx.run, listed, ctx.names))
const list = (items: readonly unknown[]) => ({ kind: "list", list: "contribute", items }) as const
</script>

<SectionFrame id="contribute" title="Which savings come first" intro="You plan to save into several accounts, and there is only so much money left after spending. When it does not cover every saving, the accounts higher in this list are paid first.">
	<ReorderList items={listed} editable={ctx.editable} busy={false} rule={() => null}
		labelOf={(id) => nameOf(ctx.names, id)}
		refused={(at) => rowRefusal(routing.place, routing.message, "contribute", at)}
		onSave={(order) => routing.save(ctx, list(order))} onTry={(order) => void routing.tryIt(ctx, list(order))}>
		{#snippet row(id, at)}<span>{at + 1}. {nameOf(ctx.names, id)}</span>{/snippet}
	</ReorderList>
	{#snippet figure()}<FigureChart label="Money saved into each account, by year" figure={saved} empty="Nothing was saved into these accounts in this run." />{/snippet}
</SectionFrame>
