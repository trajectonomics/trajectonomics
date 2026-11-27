<script lang="ts">
import { chartStore } from "../../client/charts.svelte.js"
import { screen } from "../../client/media.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import { ALWAYS_NAMES, buildCatalogue, defaultNameIndex } from "../../lib/view/charts/catalogue"
import { seriesById } from "../../lib/view/charts/resolve"
import { seriesNames } from "../../lib/view/charts/series-names"
import type { ChartDef, ChartKind } from "../../lib/view/charts/types"
import { chartView } from "../../lib/view/charts/view"
import { parseTerms } from "../../lib/view/projection/terms"
import NetWorthLines from "../projection/NetWorthLines.svelte"
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
/** Bumped when the Charts button takes focus back: after a save, a delete, a duplicate or New chart closed. */
let focusCharts = $state(0)
const chosen = $derived(chartStore.charts.find((chart) => chart.id === charts.chart))
const groups = $derived(buildCatalogue(charts.runs, run, charts.names))
const names = $derived(seriesNames(charts.runs, run, charts.names, ALWAYS_NAMES))
/** The same names with no plan label, so a default chart name reads the ids and fits every plan. */
const defaultNames = $derived(defaultNameIndex(charts.runs, charts.names))
const byId = $derived(seriesById(run, charts.names))
const view = $derived(
	chosen && chartView(chosen, byId, names, parseTerms(terms), charts.names.accounts),
)
const title = $derived(chosen && view ? chosen.name : "Net worth by year")
/** The chart is taller from `md` (Tailwind's 48rem) up, and shorter on a phone. */
const height = $derived(screen.medium ? 320 : 220)

function save(draft: { name: string; kind: ChartKind; series: readonly string[] }): void {
	const id = drawer === "new" || drawer === null ? chartStore.idFor(draft.name) : drawer.id
	if (chartStore.save({ id, ...draft })) charts.onChart(id)
	drawer = null
	focusCharts += 1
}

function closeDrawer(): void {
	if (drawer === "new") focusCharts += 1
	drawer = null
}

function remove(id: string): void {
	chartStore.remove(id)
	charts.onChart("")
	focusCharts += 1
}
</script>

<div class="space-y-3">
	<section aria-label={title} class="space-y-3">
		<ChartHeader {title} {terms} {onTerms}>
			{#snippet actions()}
				<ChartOptions
					charts={chartStore.charts}
					value={chosen?.id ?? ""}
					onChange={charts.onChart}
					onNew={() => (drawer = "new")}
					onExport={() => chartStore.exportFile()}
					onImport={(file) => chartStore.importFile(file)}
					hasCharts={chartStore.charts.length > 0}
					focusWhen={focusCharts}
				/>
			{/snippet}
		</ChartHeader>
		{#if chosen && view}
			{#key chosen.id}
				<ChartMenu
					name={chosen.name}
					onEdit={() => (drawer = chosen)}
					onDuplicate={() => {
						const id = chartStore.duplicate(chosen.id)
						if (id !== null) {
							charts.onChart(id)
							focusCharts += 1
						}
					}}
					onDelete={() => remove(chosen.id)}
				/>
			{/key}
			<CustomChart chart={chosen} {view} {height} />
		{:else}
			<NetWorthLines {run} {terms} {height} />
		{/if}
	</section>
	<ChartNotices problem={chartStore.problem} unsaved={chartStore.unsaved} notice={chartStore.notice} />
	<ChartDrawer open={drawer} {groups} {names} {defaultNames} accounts={charts.names.accounts} onSave={save} onClose={closeDrawer} />
</div>
