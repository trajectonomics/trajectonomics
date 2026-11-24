<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { annualRowsOf, monthlyRowsOf } from "../../lib/view/projection/annual"
import { headlineOf } from "../../lib/view/projection/headline"
import type { ChartsContext } from "../charts/context"
import ProjectionCharts from "../charts/ProjectionCharts.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import AnnualTable from "./AnnualTable.svelte"
import MonthlyTable from "./MonthlyTable.svelte"
import NetWorthChart from "./NetWorthChart.svelte"
import ProjectionHeadline from "./ProjectionHeadline.svelte"
import ResultStatement from "./ResultStatement.svelte"

interface Props {
	run: ProjectionRun
	/** The argv of the Read the projection came from, for its command. */
	argv: readonly string[]
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
	/** The custom charts of the Projection page. Left out, the chart is the net worth chart alone. */
	charts?: ChartsContext | undefined
}

/** One projection: its headline, the chart, the annual table, the monthly rows and its statement. */
let { run, argv, terms, onTerms, charts }: Props = $props()
const headline = $derived(headlineOf(run))
const annual = $derived(annualRowsOf(run))
const monthly = $derived(monthlyRowsOf(run))
</script>

<div class="space-y-8">
	{#if headline}
		<ProjectionHeadline {headline} currency={run.currency} />
	{:else}
		<EmptyState title="No year to show" />
	{/if}
	{#if charts}
		<ProjectionCharts {run} {terms} {onTerms} {charts} />
	{:else}
		<NetWorthChart {run} {terms} {onTerms} />
	{/if}
	<AnnualTable rows={annual} currency={run.currency} />
	{#if monthly}
		<MonthlyTable rows={monthly} count={monthly.length} />
	{/if}
	<ResultStatement shape={run} {argv} />
</div>
