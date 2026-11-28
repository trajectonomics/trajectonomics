<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { milestoneMarkers, milestoneView } from "../../lib/view/milestones/milestones"
import { netWorthSeries } from "../../lib/view/projection/chart"
import { parseTerms } from "../../lib/view/projection/terms"
import LineChart from "../chart/LineChart.svelte"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	run: ProjectionRun
	/** The terms the address bar asks for. An unknown one reads as "both". */
	terms: string
	/** The chart's height in pixels. Left out, the default line chart's height. */
	height?: number | undefined
	/** True when the page lists the reached Milestones itself, so this chart's list is only for a screen reader. */
	listedElsewhere?: boolean | undefined
}

/** The net worth chart itself, without a heading: a mark for each reached Milestone, and the marks in words. */
let { run, terms, height, listedElsewhere = false }: Props = $props()
const chosen = $derived(parseTerms(terms))
const series = $derived(netWorthSeries(run, chosen, currentItemNames().people))
const markers = $derived(milestoneMarkers(run, currentItemNames()))
const reached = $derived(milestoneView(run)?.reached ?? [])
</script>

<div class="space-y-3">
	<LineChart
		label="Net worth at the close of each year"
		{series}
		{markers}
		{height}
		endLabels
	/>
	{#if reached.length > 0}
		<!-- The marks above in words: a phone has no hover to name a shortened or unlabelled rule, so the list
		shows below the chart there unless the page lists them itself. A screen reader gets it at any width. -->
		<ul class={["space-y-1 text-xs", listedElsewhere ? "sr-only" : "not-sr-only sm:sr-only"]}>
			{#each reached as milestone (milestone.id)}
				<li><ItemName kind="milestone" id={milestone.id} />: reached on {formatDate(milestone.date)}</li>
			{/each}
		</ul>
	{/if}
</div>
