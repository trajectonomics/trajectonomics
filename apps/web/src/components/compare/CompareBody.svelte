<script lang="ts">
import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import {
	chartSides,
	compareSides,
	comparisonChart,
	figureRows,
	type Terms,
} from "../../lib/view/compare"
import Provenance from "../ui/Provenance.svelte"
import CompareChart from "./CompareChart.svelte"
import CompareFigures from "./CompareFigures.svelte"
import CompareNotes from "./CompareNotes.svelte"
import CompareSides from "./CompareSides.svelte"

interface Props {
	data: ProjectionCompare
	argv: readonly string[]
	/** The Projections by Scenario name, which the chart reads for A and B. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	terms: Terms
	onTerms: (terms: Terms) => void
}

/** The Compare page's body: the sides, the chart, the figures, and the notes. */
let { data, argv, projections, terms, onTerms }: Props = $props()
const sides = $derived(compareSides(data))
const chart = $derived(comparisonChart(chartSides(projections, data), terms))
const rows = $derived(figureRows(data))
const headers: readonly [string, string] = $derived([`A, ${sides[0].name}`, `B, ${sides[1].name}`])
</script>

<div class="space-y-8">
	<CompareSides {sides} />
	<CompareChart state={chart} {terms} {onTerms} />
	<CompareFigures {rows} currency={data.currency} {headers} />
	<CompareNotes {data} />
	<Provenance {argv} />
</div>
