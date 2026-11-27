<script lang="ts">
import type { ChartState, Terms } from "../../lib/view/compare"
import LineChart from "../chart/LineChart.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

const TERMS_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "nominal", label: "Future money" },
	{ value: "real", label: "Today's money" },
]

interface Props {
	state: ChartState
	terms: Terms
	onTerms: (terms: Terms) => void
}

/** Net worth by year for both Projections, with the nominal or real choice, or why it is not drawn. */
let { state, terms, onTerms }: Props = $props()
</script>

<section aria-labelledby="compare-chart-title" class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 id="compare-chart-title" class="text-base font-semibold">Net worth by year</h2>
		<SegmentedControl
			name="terms"
			label="Money terms"
			options={TERMS_OPTIONS}
			value={terms}
			onChange={onTerms}
		/>
	</div>
	{#if state.kind === "chart"}
		<LineChart
			label={`Net worth by year, ${terms === "nominal" ? "future money" : "today's money"}`}
			series={state.series}
		/>
	{:else}
		<EmptyState title="The chart is not drawn">
			{#each state.reasons as reason, index (index)}
				<p>{reason}</p>
			{/each}
		</EmptyState>
	{/if}
</section>
