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
	/** Replaces the heading, such as the picker of the Projection page. Left out, the heading is "Net worth by year". */
	title?: Snippet
}

/** The net worth chart by year, with the choice of terms in the address bar, and a mark for each reached Milestone. */
let { run, terms, onTerms, title }: Props = $props()
const chosen = $derived(parseTerms(terms))
const series = $derived(netWorthSeries(run, chosen, currentItemNames().people))
const markers = $derived(milestoneMarkers(run, currentItemNames()))
const reached = $derived(milestoneView(run)?.reached ?? [])
</script>

<section aria-labelledby="net-worth-chart" class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if title}
			{@render title()}
		{:else}
			<h2 id="net-worth-chart" class="text-base font-semibold">Net worth by year</h2>
		{/if}
		<TermsControl value={chosen} onChange={onTerms} />
	</div>
	<LineChart label="Net worth at the close of each year" {series} {markers} />
	{#if reached.length > 0}
		<!-- The marks above, in words, for a reader who cannot see them. -->
		<ul class="sr-only">
			{#each reached as milestone (milestone.id)}
				<li><ItemName kind="milestone" id={milestone.id} />: reached on {formatDate(milestone.date)}</li>
			{/each}
		</ul>
	{/if}
</section>
