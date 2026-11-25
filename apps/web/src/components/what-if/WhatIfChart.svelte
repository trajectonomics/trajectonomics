<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { parseTerms } from "../../lib/view/projection/terms"
import { whatIfSeries } from "../../lib/view/what-if/chart"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	whatIf: ProjectionRun
	/** The plan's own run, or null when the Snapshot holds none: the chart then draws the what-if alone. */
	baseline: ProjectionRun | null
	terms: string
}

/** The net worth of the what-if drawn over the baseline's: the what-if solid, the baseline dashed, both named. With amounts hidden, only the what-if draws. */
let { whatIf, baseline, terms }: Props = $props()
const hidden = $derived(preferences.hidden)
const series = $derived(whatIfSeries(whatIf, baseline, parseTerms(terms), hidden))
const label = $derived(
	hidden
		? "Net worth at the close of each year: the what-if"
		: "Net worth at the close of each year: the what-if, solid, over the baseline, dashed",
)
</script>

<LineChart {label} {series} />
<!-- The note names a baseline only when there is one to hide. -->
{#if hidden && baseline !== null}
	<p class="mt-2 text-sm text-muted-foreground">The baseline is hidden with the amounts, because drawing it would show which way the change moved.</p>
{/if}
