<script lang="ts">
import { taxYearTriples } from "../../lib/view/what-if/tax"
import { yearLabels, yearRows } from "../../lib/view/what-if/years"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"
import WhatIfYears from "./WhatIfYears.svelte"

interface Props {
	lens: WhatIfLens
}

/** Each tax year's what-if figures beside the baseline's, and the Levy's change per year from the compare. */
let { lens }: Props = $props()
const taxYears = $derived(lens.compare === null ? [] : taxYearTriples(lens.compare))
const levy = $derived(lens.compare === null ? [] : yearRows(lens.compare, ["levy"]))
</script>

{#if taxYears.length > 0 || levy.some((row) => row.figures.length > 0)}
	<WhatIfPanel plan={lens.plan} intro="Each Levy's settlement period with the session's changes.">
		{#each taxYears as year (year.key)}
			<section class="space-y-2">
				<h3 class="text-sm font-medium">Levy {year.levy}, {year.period} <span class="text-muted-foreground">(settles {year.settles})</span></h3>
				<FigureList triples={year.figures} />
			</section>
		{/each}
		{#if levy.some((row) => row.figures.length > 0)}
			<WhatIfYears rows={levy} labels={yearLabels(levy)} caption="The Levy each year, the what-if beside the baseline" />
		{/if}
	</WhatIfPanel>
{/if}
