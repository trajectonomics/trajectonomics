<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import type { CachePlanRow } from "../lib/cache-rate"
import type { PlanTotal } from "../lib/plan-totals"
import type { ScatterPoint } from "../lib/scatter"
import { METHOD_PATH } from "../lib/site"
import { cacheTakeaway } from "../lib/takeaways"
import CacheTable from "./CacheTable.svelte"
import DataSection from "./DataSection.svelte"
import PlanBreakdown from "./PlanBreakdown.svelte"
import ScatterChart from "./ScatterChart.svelte"

let {
	totals,
	cacheRows,
	cacheDots,
	from,
	to,
}: {
	totals: PlanTotal[]
	cacheRows: CachePlanRow[]
	cacheDots: ScatterPoint[]
	from: string
	to: string
} = $props()

const takeaway = $derived(cacheTakeaway(cacheRows))
</script>

<DataSection
	id="tokens"
	title="Cache"
	href={`${METHOD_PATH}#tokens`}
	direction="More cache is cheaper."
	{takeaway}
>
	{#snippet chart()}
		<PlanBreakdown {totals} {from} {to} />
		<CacheTable rows={cacheRows} {from} {to} />
		{#if cacheDots.length > 0}
			<ScatterChart
				points={cacheDots}
				xTitle="Cache rate"
				yTitle="Tokens/$"
				xKind="percent"
				yKind="tokens"
				xDomain={[0, 100]}
				caption="One dot per priced plan with a cache split; a hollow dot is the most we used."
			/>
		{/if}
	{/snippet}
	{#snippet notes()}
		<p>
			Input, output, cache read and cache write as we counted them; a plan's bar holds only the
			parts its source reports. Cache rate is cache read ÷ all tokens, the same measure as the
			cache line beside a peak. A source that reports no cache split says “no cache split”, and
			its plan has no dot in the chart.
		</p>
		<p>
			Tokens/$ is calculated as in <a href="#value">Value</a>. Prices were read on
			2026-11-27; every one and its source is in
			<a href={`${METHOD_PATH}#prices`}>Prices</a>.
		</p>
	{/snippet}
</DataSection>
