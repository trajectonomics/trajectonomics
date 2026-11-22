<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { netWorthSeries } from "../../lib/view/projection/chart"
import { parseTerms, type Terms } from "../../lib/view/projection/terms"
import LineChart from "../chart/LineChart.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Nominal" },
	{ value: "real", label: "Real, in As-of terms" },
]

interface Props {
	run: ProjectionRun
	/** The terms the address bar asks for. An unknown one reads as "both". */
	terms: string
	onTerms: (value: string) => void
}

/** The net worth chart by year, with the choice of terms in the address bar. */
let { run, terms, onTerms }: Props = $props()
const chosen = $derived(parseTerms(terms))
const series = $derived(netWorthSeries(run, chosen))
</script>

<section aria-labelledby="net-worth-chart" class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 id="net-worth-chart" class="text-base font-semibold">Net worth by year</h2>
		<SegmentedControl
			name="terms"
			label="Terms"
			options={TERM_OPTIONS}
			value={chosen}
			onChange={onTerms}
		/>
	</div>
	<LineChart label="Net worth at the close of each year" {series} />
</section>
