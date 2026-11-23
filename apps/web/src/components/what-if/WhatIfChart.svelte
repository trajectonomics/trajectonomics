<script lang="ts">
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

/** The net worth of the what-if drawn over the baseline's: the what-if solid, the baseline dashed, both named. */
let { whatIf, baseline, terms }: Props = $props()
const series = $derived(whatIfSeries(whatIf, baseline, parseTerms(terms)))
</script>

<LineChart label="Net worth at the close of each year: the what-if, solid, over the baseline, dashed" {series} />
