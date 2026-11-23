<script lang="ts">
import type { Snippet } from "svelte"
import type { ProjectionRun } from "../../lib/contract"
import { figureTriples } from "../../lib/view/what-if/figures"
import { type YearFigure, yearLabels, yearRows } from "../../lib/view/what-if/years"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfChart from "./WhatIfChart.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"
import WhatIfYears from "./WhatIfYears.svelte"

interface Props {
	lens: WhatIfLens
	/** The plan's own projection, for the baseline line. */
	baseline: ProjectionRun | null
	terms: string
	/** The figures the year table shows. */
	keys: readonly YearFigure[]
	/** Whether the headline figures (FI date, net worth at the end, run-out) show above the chart. */
	headline?: boolean
	/** More figures of the same what-if, drawn under the headline: the chance, the tax. */
	extra?: Snippet
}

/** A what-if on a projected plan: the headline figures, the chart with both lines, and the years with their changes. */
let { lens, baseline, terms, keys, headline = true, extra }: Props = $props()
const triples = $derived(lens.compare === null || !headline ? [] : figureTriples(lens.compare))
const rows = $derived(lens.compare === null ? [] : yearRows(lens.compare, keys))
</script>

<WhatIfPanel plan={lens.plan} intro="The plan with the session's changes, projected year by year.">
	{#if triples.length > 0}
		<FigureList {triples} />
	{/if}
	{@render extra?.()}
	{#if lens.run !== null}
		<WhatIfChart whatIf={lens.run} {baseline} {terms} />
	{/if}
	{#if rows.length > 0}
		<WhatIfYears {rows} labels={yearLabels(rows)} caption="Each year, the what-if beside the baseline" />
	{/if}
</WhatIfPanel>
