<script lang="ts">
import { layoutFlow } from "../../lib/chart/flow"
import { formatDate } from "../../lib/format"
import type { EstateView } from "../../lib/view/estate"
import type { Terms } from "../../lib/view/projection/terms"
import FlowDiagram from "../cashflow/FlowDiagram.svelte"
import FlowProbe from "../cashflow/FlowProbe.svelte"
import Money from "../ui/Money.svelte"
import EstateBreakdown from "./EstateBreakdown.svelte"
import EstateChart from "./EstateChart.svelte"
import EstateHeadline from "./EstateHeadline.svelte"

interface Props {
	view: EstateView
	terms: Terms
	/** Names the block when a what-if shows two: "With your try" or "Saved plan". Absent when there is one. */
	title?: string | undefined
}

/** One plan's estate on the chosen date: the headline, where the rest goes, and what heirs receive year by year. */
let { view, terms, title }: Props = $props()
let picked: string | null = $state(null)
/** The page's one probe for this diagram, always drawn so the names fit the size the SVG draws. */
let probe = $state<SVGTextElement | null>(null)
const layout = $derived(view.flow === null ? null : layoutFlow(view.flow))
const pick = (key: string): void => {
	picked = picked === key ? null : key
}
</script>

<div class="space-y-6">
	{#if title}<h2 class="text-lg font-semibold">{title}</h2>{/if}
	<EstateHeadline figures={view.figures} {terms} />
	{#if view.figures.shortfall !== null}
		<p role="status" class="rounded-lg border border-destructive p-3 text-sm">
			On {formatDate(view.figures.date)}, debts and costs come to more than everything owned, so heirs would receive nothing and gifts are not made. The shortfall is <Money amount={view.figures.shortfall} currency={view.figures.currency} />.
		</p>
	{/if}
	{#if layout !== null}
		<section aria-label="Where the estate goes" class="space-y-3">
			<h3 class="text-base font-semibold">Where it goes</h3>
			{#if terms === "real"}<p class="text-xs text-muted-foreground">Future money: the bands are in the money of each date, because only the net estate and what heirs receive are stated in today's money.</p>{/if}
			<FlowProbe bind:text={probe} />
			<FlowDiagram {probe} {layout} {picked} onPick={pick} label={`The estate on ${formatDate(view.figures.date)}, from the gross estate to debts, costs, gifts and heirs`} />
		</section>
	{/if}
	<EstateBreakdown figures={view.figures} {terms} {picked} onPick={pick} />
	<EstateChart {view} />
</div>
