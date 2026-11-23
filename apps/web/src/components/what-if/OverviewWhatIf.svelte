<script lang="ts">
import type { ProjectionChance, ProjectionRun } from "../../lib/contract"
import { overviewExtras } from "../../lib/view/what-if/overview"
import type { WhatIfLens } from "../../lib/what-if/lens"
import ChanceFigure from "./ChanceFigure.svelte"
import FigureTriple from "./FigureTriple.svelte"
import ProjectionWhatIf from "./ProjectionWhatIf.svelte"

interface Props {
	lens: WhatIfLens
	baseline: ProjectionRun | null
	baselineChance: ProjectionChance | null
}

/** The Overview's what-if: the headline figures, the chance, the first tax year, the chart and the closing net worth. */
let { lens, baseline, baselineChance }: Props = $props()
const extras = $derived(overviewExtras(lens, baselineChance))
</script>

<ProjectionWhatIf {lens} {baseline} terms="nominal" keys={["closingNetWorth"]}>
	{#snippet extra()}
		<div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
			{#if extras.chance}
				<div>
					<h3 class="text-sm text-muted-foreground">Chance of success</h3>
					<div class="mt-1"><ChanceFigure chance={extras.chance} /></div>
				</div>
			{/if}
			{#if extras.tax}
				<div>
					<h3 class="text-sm text-muted-foreground">{extras.tax.label}</h3>
					<div class="mt-1"><FigureTriple triple={extras.tax} large /></div>
				</div>
			{/if}
		</div>
	{/snippet}
</ProjectionWhatIf>
