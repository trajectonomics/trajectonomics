<script lang="ts">
import { chartStore } from "../../client/charts.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { ALWAYS_NAMES, buildCatalogue, defaultNameIndex } from "../../lib/view/charts/catalogue"
import { seriesById } from "../../lib/view/charts/resolve"
import { seriesNames } from "../../lib/view/charts/series-names"
import type { ChartDef, ChartKind } from "../../lib/view/charts/types"
import { chartView } from "../../lib/view/charts/view"
import { parseTerms } from "../../lib/view/projection/terms"
import NetWorthChart from "../projection/NetWorthChart.svelte"
import ChartDrawer from "./ChartDrawer.svelte"
import ChartHeader from "./ChartHeader.svelte"
import ChartMenu from "./ChartMenu.svelte"
import ChartNotices from "./ChartNotices.svelte"
import ChartOptions from "./ChartOptions.svelte"
import CustomChart from "./CustomChart.svelte"
import type { ChartsContext } from "./context"

interface Props {
	run: ProjectionRun
	terms: string
	onTerms: (value: string) => void
	charts: ChartsContext
}

/** The Plan's chart: the net worth chart or one the person made, with its picker behind the Charts button. */
let { run, terms, onTerms, charts }: Props = $props()
let drawer = $state<"new" | ChartDef | null>(null)
let width = $state(0)
const chosen = $derived(chartStore.charts.find((chart) => chart.id === charts.chart))
const groups = $derived(buildCatalogue(charts.runs, run, charts.names))
const names = $derived(seriesNames(charts.runs, run, charts.names, ALWAYS_NAMES))
/** The same names with no plan label, so a default chart name reads the ids and fits every plan. */
const defaultNames = $derived(defaultNameIndex(charts.runs, charts.names))
const view = $derived(
	chosen &&
		chartView(
			chosen,
			seriesById(run, charts.names),
			names,
			parseTerms(terms),
			charts.names.accounts,
		),
)
/** The chart is large at `md` and above (Tailwind's 48rem), and shorter on a phone. */
const height = $derived(width >= 768 ? 320 : 220)

function save(draft: { name: string; kind: ChartKind; series: readonly string[] }): void {
	const id = drawer === "new" || drawer === null ? chartStore.idFor(draft.name) : drawer.id
	if (chartStore.save({ id, ...draft })) charts.onChart(id)
	drawer = null
}
</script>

{#snippet options()}
	<ChartOptions
		charts={chartStore.charts}
		value={chosen?.id ?? ""}
		onChange={charts.onChart}
		onNew={() => (drawer = "new")}
		onExport={() => chartStore.exportFile()}
		onImport={(file) => chartStore.importFile(file)}
		hasCharts={chartStore.charts.length > 0}
	/>
{/snippet}

<div class="space-y-3" bind:clientWidth={width}>
	{#if chosen && view}
		<section aria-label={chosen.name} class="space-y-3">
			<ChartHeader title={chosen.name} {terms} {onTerms}>
				{#snippet actions()}{@render options()}{/snippet}
			</ChartHeader>
			{#key chosen.id}
				<ChartMenu
					name={chosen.name}
					onEdit={() => (drawer = chosen)}
					onDuplicate={() => {
						const id = chartStore.duplicate(chosen.id)
						if (id !== null) charts.onChart(id)
					}}
					onDelete={() => {
						chartStore.remove(chosen.id)
						charts.onChart("")
					}}
				/>
			{/key}
			<CustomChart chart={chosen} {view} {height} />
		</section>
	{:else}
		<NetWorthChart {run} {terms} {onTerms} {height}>
			{#snippet actions()}{@render options()}{/snippet}
		</NetWorthChart>
	{/if}
	<ChartNotices problem={chartStore.problem} unsaved={chartStore.unsaved} notice={chartStore.notice} />
	<ChartDrawer open={drawer} {groups} {names} {defaultNames} accounts={charts.names.accounts} onSave={save} onClose={() => (drawer = null)} />
</div>
