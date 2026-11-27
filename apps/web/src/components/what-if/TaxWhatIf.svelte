<script lang="ts">
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import { returnLabel } from "../../lib/view/tax-settings/return-name"
import { type TaxYearTriples, taxYearTriples } from "../../lib/view/what-if/tax"
import { yearLabels, yearRows } from "../../lib/view/what-if/years"
import type { WhatIfLens } from "../../lib/what-if/lens"
import FigureList from "./FigureList.svelte"
import WhatIfPanel from "./WhatIfPanel.svelte"
import WhatIfYears from "./WhatIfYears.svelte"

interface Props {
	lens: WhatIfLens
	/** The household's people, so a separate filing's heading names each Filer by role. */
	people?: PersonNames
	/** The recorded `claimsHolder`, so a departed Filer reads as the profile does. */
	claimsHolder?: string | null
}

/** Each tax year's what-if figures beside the baseline's, and the tax's change per year from the compare. */
let { lens, people = NO_PEOPLE, claimsHolder = null }: Props = $props()
const taxYears = $derived(lens.compare === null ? [] : taxYearTriples(lens.compare))
const levy = $derived(lens.compare === null ? [] : yearRows(lens.compare, ["levy"]))
const filers = $derived([
	...new Set(taxYears.flatMap((year) => (year.filer === null ? [] : [year.filer]))),
])

/** The year's heading: a separate filing names the Filer, so two Returns of one period read apart. */
function headingOf(year: TaxYearTriples): string {
	if (year.filer === null) return `Tax for ${year.period}`
	const filer = returnLabel(year.filer, people, claimsHolder, filers).text
	return `${filer}: tax for ${year.period}`
}
</script>

{#if taxYears.length > 0 || levy.some((row) => row.figures.length > 0)}
	<WhatIfPanel plan={lens.plan} intro="Each tax year's settlement period with the session's changes.">
		{#each taxYears as year (year.key)}
			<section class="space-y-2">
				<h3 class="text-sm font-medium">{headingOf(year)} <span class="text-muted-foreground">(due {year.settles})</span></h3>
				<FigureList triples={year.figures} />
			</section>
		{/each}
		{#if levy.some((row) => row.figures.length > 0)}
			<WhatIfYears rows={levy} labels={yearLabels(levy)} caption="The tax each year, the what-if beside the baseline" />
		{/if}
	</WhatIfPanel>
{/if}
