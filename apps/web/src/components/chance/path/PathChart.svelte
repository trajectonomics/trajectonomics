<script lang="ts">
import { currentItemNames } from "../../../client/item-names.svelte.js"
import type { ProjectionPath } from "../../../lib/contract"
import { formatDate } from "../../../lib/format"
import { RUN_OUT_LABEL } from "../../../lib/view/chance/path-rows"
import { pathMarkers } from "../../../lib/view/chance/path-view"
import { milestoneView } from "../../../lib/view/milestones/milestones"
import { netWorthSeries } from "../../../lib/view/projection/chart"
import { parseTerms } from "../../../lib/view/projection/terms"
import LineChart from "../../chart/LineChart.svelte"
import TermsControl from "../../projection/TermsControl.svelte"
import ItemName from "../../ui/ItemName.svelte"

interface Props {
	path: ProjectionPath
	/** The terms the address bar asks for. An unknown one reads as "both". */
	terms: string
	onTerms: (value: string) => void
}

/** Net worth at the close of each year of one future, as bars, with the Milestones it reached and where the money ran out. */
let { path, terms, onTerms }: Props = $props()
const chosen = $derived(parseTerms(terms))
const reached = $derived(milestoneView(path)?.reached ?? [])
</script>

<section aria-labelledby="path-chart" class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 id="path-chart" class="text-base font-semibold">Net worth by year</h3>
		<TermsControl value={chosen} onChange={onTerms} />
	</div>
	<LineChart
		label="Net worth at the close of each year of this future"
		series={netWorthSeries(path, chosen, currentItemNames().people)}
		markers={pathMarkers(path, currentItemNames())}
		kind="bars"
	/>
	<!-- The marks above, in words, for a reader who cannot see them. -->
	<ul class="sr-only">
		{#each reached as milestone (milestone.id)}
			<li><ItemName kind="milestone" id={milestone.id} />: reached on {formatDate(milestone.date)}</li>
		{/each}
		{#if path.runsOut !== null}
			<li>{RUN_OUT_LABEL}: {formatDate(path.runsOut.date)}</li>
		{/if}
	</ul>
</section>
