<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { METHOD_PATH } from "../lib/site"
import { valueTakeaway } from "../lib/takeaways"
import type { UsageRow } from "../lib/types"
import { valuePoints } from "../lib/value-points"
import type { WeeklyFigure } from "../lib/weekly"
import DataSection from "./DataSection.svelte"
import ScatterChart from "./ScatterChart.svelte"

let { week, rows }: { week: WeeklyFigure[]; rows: UsageRow[] } = $props()

const points = $derived(valuePoints(week, rows))
const takeaway = $derived(valueTakeaway(points))
</script>

<DataSection
	id="value"
	title="Value for money"
	href={`${METHOD_PATH}#value`}
	direction="Up and to the right is better: more API value per dollar."
	{takeaway}
>
	{#snippet chart()}
		{#if points.length > 0}
			<ScatterChart
				{points}
				xTitle="API value per $1"
				yTitle="Tokens per $1"
				xKind="usd"
				yKind="tokens"
				caption="Tokens per $1 against API value per $1, one dot per priced plan. A hollow dot is the most we used, not an estimate."
			/>
		{:else}
			<p class="section-empty">No plan has both a weekly figure and a price yet.</p>
		{/if}
	{/snippet}
	{#snippet notes()}
		<p>
			Tokens per $1 is the week's tokens from <a href="#plans">What each plan gives</a> ÷ the
			weekly price (monthly USD × 12 / 52). API value per $1 is the week's tokens × the blended
			API list price of the plan's own model mix ÷ the weekly price. The blend prices the tokens
			in, out, cache read and cache write we actually used, and divides by the tokens without
			cache reads.
		</p>
		<p>
			Rows missing a price are left out: a model with no list price stays out of the blend, and a
			plan whose models all lack one has no dot. A free plan has no price to divide by. A hollow
			dot is the most we used, not an estimate. The shaded area is above the median on both axes,
			or the upper-right third when there are fewer than three dots.
		</p>
		<p>
			Prices were read on 2026-11-27. Every figure and its source is in
			<a href={`${METHOD_PATH}#prices`}>Prices</a>.
		</p>
	{/snippet}
</DataSection>
