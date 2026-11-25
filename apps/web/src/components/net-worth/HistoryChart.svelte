<script lang="ts">
import type { HistoryView } from "../../lib/view/net-worth/page"
import LineChart from "../chart/LineChart.svelte"

interface Props {
	history: HistoryView
}

let { history }: Props = $props()
</script>

<!-- The month-end net worth line, and one line on how many reads the history used. -->
<section aria-labelledby="history-title" class="space-y-3">
	<h2 id="history-title" class="text-base font-semibold">Month-end history</h2>
	<LineChart label="Net worth at each month-end" series={[history.series]} />
	<p class="text-sm text-muted-foreground">{history.line}</p>
	{#if history.cut !== null}
		<p class="text-sm text-muted-foreground">{history.cut}</p>
	{/if}
</section>
