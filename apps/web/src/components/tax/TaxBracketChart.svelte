<script lang="ts">
import type { BracketChart } from "../../lib/view/tax"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	chart: BracketChart
}

let { chart }: Props = $props()
</script>

<!-- Taxable income by bracket for every tax year, and the top rate as a step line on the right axis. -->
<section aria-labelledby="tax-bracket-chart-title" class="space-y-3">
	<h2 id="tax-bracket-chart-title" class="text-base font-semibold">Taxable income by bracket</h2>
	<p class="text-sm text-muted-foreground">
		Nominal figures: a tax year states no figure in today's money. The line is the top rate, read on the right.
	</p>
	<LineChart
		label="Taxable income by bracket, nominal, with the top rate"
		series={chart.series}
		kind="stacked-bars"
		step={chart.step ?? undefined}
	/>
</section>
