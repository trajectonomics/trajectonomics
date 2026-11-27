<script lang="ts">
import type { Snippet } from "svelte"
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { milestoneMarkers, milestoneView } from "../../lib/view/milestones/milestones"
import { netWorthSeries } from "../../lib/view/projection/chart"
import { parseTerms } from "../../lib/view/projection/terms"
import LineChart from "../chart/LineChart.svelte"
import ItemName from "../ui/ItemName.svelte"
import TermsControl from "./TermsControl.svelte"

interface Props {
	run: ProjectionRun
	/** The terms the address bar asks for. An unknown one reads as "both". */
	terms: string
	onTerms: (value: string) => void
	/** The heading. Left out, "Net worth by year". */
	title?: string
	/** Controls beside the terms control, such as the chart picker. */
	actions?: Snippet
	/** The chart's height in pixels. Left out, the default line chart's height. */
	height?: number
	/** True when the page lists the reached Milestones itself, so this chart's list is only for a screen reader. */
	listedElsewhere?: boolean
}

/** The net worth chart by year, with the choice of terms in the address bar, and a mark for each reached Milestone. */
let {
	run,
	terms,
	onTerms,
	title = "Net worth by year",
	actions,
	height,
	listedElsewhere = false,
}: Props = $props()
const chosen = $derived(parseTerms(terms))
const series = $derived(netWorthSeries(run, chosen, currentItemNames().people))
const markers = $derived(milestoneMarkers(run, currentItemNames()))
const reached = $derived(milestoneView(run)?.reached ?? [])
</script>

<section aria-labelledby="net-worth-chart" class="space-y-3">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h2 id="net-worth-chart" class="min-w-0 max-w-full text-base font-semibold break-words">
			{title}
		</h2>
		<div class="flex flex-wrap items-center gap-2">
			<TermsControl value={chosen} onChange={onTerms} />
			{@render actions?.()}
		</div>
	</div>
	<LineChart label="Net worth at the close of each year" {series} {markers} {height} />
	{#if reached.length > 0}
		<!-- The marks above in words: a phone has no hover to name a shortened or unlabelled rule, so the list
		shows below the chart there unless the page lists them itself. A screen reader gets it at any width. -->
		<ul class={["space-y-1 text-xs", listedElsewhere ? "sr-only" : "not-sr-only sm:sr-only"]}>
			{#each reached as milestone (milestone.id)}
				<li><ItemName kind="milestone" id={milestone.id} />: reached on {formatDate(milestone.date)}</li>
			{/each}
		</ul>
	{/if}
</section>
