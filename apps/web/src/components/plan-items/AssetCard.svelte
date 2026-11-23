<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { AssetCardView } from "../../lib/view/plan-items/asset-card"
import LineChart from "../chart/LineChart.svelte"
import Money from "../ui/Money.svelte"
import GroupSwitch from "../what-if/GroupSwitch.svelte"
import AssetFacts from "./AssetFacts.svelte"

interface Props {
	card: AssetCardView
	currency: string
	editable: boolean
	/** The plan and the content hash the page read for it: the what-if switches name both. */
	plan: string
	contentHash: string
	onEdit: () => void
	onTry: () => void
}

let { card, currency, editable, plan, contentHash, onEdit, onTry }: Props = $props()
const off = $derived(whatIfSession.isGroupOffIn(plan, card.switch.spec))
const button =
	"rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<li class="min-w-0 rounded-lg border border-border bg-card p-4 {off ? 'opacity-60' : ''}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h3 class="min-w-0 font-semibold break-all">{card.title}</h3>
		{#if editable && card.outside.length === 0}
			<button type="button" aria-label="Edit asset {card.id}" onclick={onEdit} class="shrink-0 {button}">Edit</button>
		{/if}
	</div>
	<p class="text-sm text-muted-foreground">Home or car{card.owned ? ", owned already" : ""}. In net worth, not in accessible net worth.</p>
	{#if card.baselineValue !== null}
		<p class="mt-2 text-lg"><Money amount={card.baselineValue} {currency} /></p>
		<p class="text-xs text-muted-foreground">Value in the Baseline</p>
	{/if}
	<dl class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
		{#each card.rows as row (row.label)}
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd class="min-w-0 break-words">{row.before}{#if row.amount !== null}{" "}<Money amount={row.amount} {currency} />{/if}{row.after ? ` ${row.after}` : ""}</dd>
		{/each}
	</dl>
	<div class="mt-3 min-w-0 overflow-x-auto">
		{#if card.chart !== null}
			<LineChart label="Value of {card.title} at the close of each year" series={card.chart.series} markers={card.chart.markers} />
		{:else}
			<p class="text-sm text-muted-foreground">This Projection states no value for the asset.</p>
		{/if}
	</div>
	<AssetFacts {card} {currency} />
	{#if editable}
		<p class="mt-3 text-xs text-muted-foreground">
			A What-if switches the asset off with its costs, rent, sale and loan, or tries its values together. It cannot add or take out one of them.
		</p>
		<GroupSwitch {plan} {contentHash} group={card.switch} label={card.title} {onTry} />
	{/if}
</li>
