<script lang="ts">
import { tick } from "svelte"
import { focusById } from "../../client/browser.js"
import { chartStore } from "../../client/charts.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { ALWAYS_NAMES, buildCatalogue, defaultNameIndex } from "../../lib/view/charts/catalogue"
import { seriesById } from "../../lib/view/charts/resolve"
import { seriesNames } from "../../lib/view/charts/series-names"
import type { ChartDef, ChartKind } from "../../lib/view/charts/types"
import { chartView } from "../../lib/view/charts/view"
import { parseTerms } from "../../lib/view/projection/terms"
import NetWorthChart from "../projection/NetWorthChart.svelte"
import TermsControl from "../projection/TermsControl.svelte"
import ChartDrawer from "./ChartDrawer.svelte"
import ChartFiles from "./ChartFiles.svelte"
import ChartMenu from "./ChartMenu.svelte"
import ChartNotices from "./ChartNotices.svelte"
import ChartPicker from "./ChartPicker.svelte"
import CustomChart from "./CustomChart.svelte"
import type { ChartsContext } from "./context"

interface Props {
	run: ProjectionRun
	terms: string
	onTerms: (value: string) => void
	charts: ChartsContext
}

/** The Projection's chart: its title picks the net worth chart or one the person made, and makes a new one. */
let { run, terms, onTerms, charts }: Props = $props()
const PICKER = "net-worth-chart"
let drawer = $state<"new" | ChartDef | null>(null)
const chosen = $derived(chartStore.charts.find((chart) => chart.id === charts.chart))
const groups = $derived(buildCatalogue(charts.runs, run, charts.names))
const names = $derived(seriesNames(charts.runs, run, charts.names, ALWAYS_NAMES))
/** The same names with no plan label, so a default chart name reads the ids and fits every plan. */
const defaultNames = $derived(defaultNameIndex(charts.runs, charts.names))
const view = $derived(
	chosen && chartView(chosen, seriesById(run, charts.names), names, parseTerms(terms)),
)

/** Gives focus to the picker, which is a new element once the chart changed. */
function refocus(): void {
	void tick().then(() => focusById(`${PICKER}-select`))
}

function close(): void {
	drawer = null
	refocus()
}

function save(draft: { name: string; kind: ChartKind; series: readonly string[] }): void {
	const id = drawer === "new" || drawer === null ? chartStore.idFor(draft.name) : drawer.id
	if (chartStore.save({ id, ...draft })) charts.onChart(id)
	close()
}
</script>

{#snippet picker()}
	<ChartPicker id={PICKER} charts={chartStore.charts} value={chosen?.id ?? ""} onChange={charts.onChart} onNew={() => (drawer = "new")} />
{/snippet}

<div class="space-y-3">
	{#if chosen && view}
		<section aria-labelledby={PICKER} class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				{@render picker()}
				<TermsControl value={parseTerms(terms)} onChange={onTerms} />
			</div>
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
						refocus()
					}}
				/>
			{/key}
			<CustomChart chart={chosen} {view} />
		</section>
	{:else}
		<NetWorthChart {run} {terms} {onTerms} title={picker} />
	{/if}
	<ChartNotices problem={chartStore.problem} unsaved={chartStore.unsaved} notice={chartStore.notice} />
	<ChartFiles hasCharts={chartStore.charts.length > 0} onExport={() => chartStore.exportFile()} onImport={(file) => chartStore.importFile(file)} />
	<ChartDrawer open={drawer} {groups} {names} {defaultNames} onSave={save} onClose={close} />
</div>
