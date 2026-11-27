<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { annualRowsOf, monthlyRowsOf } from "../../lib/view/projection/annual"
import AnnualTable from "./AnnualTable.svelte"
import MonthlyTable from "./MonthlyTable.svelte"
import ResultStatement from "./ResultStatement.svelte"

interface Props {
	run: ProjectionRun
	/** The argv of the Read the projection came from, for its command. */
	argv: readonly string[]
}

/** One projection's year tables and its statement. The chart and the figures open the Plan page. */
let { run, argv }: Props = $props()
const annual = $derived(annualRowsOf(run))
const monthly = $derived(monthlyRowsOf(run))
</script>

<div class="space-y-8">
	<AnnualTable rows={annual} currency={run.currency} />
	{#if monthly}
		<MonthlyTable rows={monthly} count={monthly.length} />
	{/if}
	<ResultStatement name="Projection" shape={run} {argv} />
</div>
