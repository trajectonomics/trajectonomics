<script lang="ts">
import type { Snippet } from "svelte"
import type { ProjectionRun } from "../../lib/contract"
import ChartHeader from "../charts/ChartHeader.svelte"
import NetWorthLines from "./NetWorthLines.svelte"

interface Props {
	run: ProjectionRun
	/** The terms the address bar asks for. An unknown one reads as "both". */
	terms: string
	onTerms: (value: string) => void
	/** The heading. Left out, "Net worth by year". */
	title?: string
	/** Controls beside the heading, such as the chart picker. */
	actions?: Snippet
	/** The chart's height in pixels. Left out, the default line chart's height. */
	height?: number | undefined
	/** True when the page lists the reached Milestones itself, so this chart's list is only for a screen reader. */
	listedElsewhere?: boolean | undefined
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
</script>

<section aria-labelledby="net-worth-chart" class="space-y-3">
	<ChartHeader {title} headingId="net-worth-chart" {terms} {onTerms} {actions} />
	<NetWorthLines {run} {terms} {height} {listedElsewhere} />
</section>
