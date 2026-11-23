<script lang="ts">
import type { EstateView } from "../../lib/view/estate"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	view: EstateView
}

/** What heirs would receive at the close of each year, with a mark on the date the page reads. */
let { view }: Props = $props()
</script>

<section aria-label="What heirs would receive, year by year" class="space-y-3">
	<h3 class="text-base font-semibold">Year by year</h3>
	<LineChart label="What heirs would receive at the close of each year" series={view.series} markers={view.markers} />
</section>
