<script lang="ts">
import type { LineSeries } from "../../lib/chart"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	series: readonly LineSeries[]
}

let { series }: Props = $props()
</script>

<!-- Due and owed by tax year. Owed is dashed, so the two lines tell apart without colour. -->
<section aria-labelledby="tax-chart-title" class="space-y-3">
	<h2 id="tax-chart-title" class="text-base font-semibold">Due and owed by tax year</h2>
	<LineChart label="Due and owed by tax year" {series} />
</section>
