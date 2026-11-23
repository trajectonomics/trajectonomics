<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { chooseRollup, rollupsOf, yearLabel } from "../../lib/view/cashflow/cashflow"
import { cashflowTriples } from "../../lib/view/what-if/cashflow"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"

interface Props {
	lens: WhatIfLens
	/** The plan's own projection, for the baseline totals of the same year. */
	baseline: ProjectionRun | null
	/** The year the address bar asks for. */
	year: string
}

/** The section totals of the chosen year in the what-if beside the baseline's. The CLI states no change for them. */
let { lens, baseline, year }: Props = $props()
const rollup = $derived(lens.run === null ? null : chooseRollup(rollupsOf(lens.run), year))
const triples = $derived(
	lens.run === null || rollup === null ? [] : cashflowTriples(lens.run, baseline, rollup.index),
)
</script>

{#if rollup && triples.length > 0}
	<WhatIfPanel plan={lens.plan} intro={`The cash flow of ${yearLabel(rollup)} with the session's changes.`}>
		<FigureList {triples} />
	</WhatIfPanel>
{/if}
