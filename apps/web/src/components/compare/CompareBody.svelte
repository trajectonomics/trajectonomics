<script lang="ts">
import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import {
	chartSides,
	compareSides,
	comparisonChart,
	figureRows,
	type Terms,
} from "../../lib/view/compare"
import Fact from "../projection/Fact.svelte"
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

/** The Compare page's body: the sides, the chart, the figures, the notes and the provenance. */
let { data, argv, projections, terms, onTerms }: Props = $props()
const sides = $derived(compareSides(data))
const chart = $derived(comparisonChart(chartSides(projections, data), terms))
const rows = $derived(figureRows(data))
const headers: readonly [string, string] = $derived([`A, ${sides[0].name}`, `B, ${sides[1].name}`])
const sidesWithHashes = $derived([
	{ letter: "A", scenario: data.sides.a.scenario },
	{ letter: "B", scenario: data.sides.b.scenario },
])
</script>

<div class="space-y-8">
	<CompareSides {sides} />
	<CompareChart state={chart} {terms} {onTerms} />
	<CompareFigures {rows} currency={data.currency} {headers} />
	<CompareNotes {data} />
	<Provenance name="Comparison" commands={[argv]}>
		{#snippet details()}
			<dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
				{#each sidesWithHashes as side (side.letter)}
					<Fact label={`Content hash, ${side.letter}`}>
						<code class="block break-all font-mono text-xs">{side.scenario.contentHash}</code>
					</Fact>
					<Fact label={`Effective hash, ${side.letter}`}>
						<code class="block break-all font-mono text-xs">{side.scenario.effectiveContentHash}</code>
					</Fact>
				{/each}
			</dl>
		{/snippet}
	</Provenance>
</div>
