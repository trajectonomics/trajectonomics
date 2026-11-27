<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { type PlanUnit, planBars } from "../lib/plan-bars"
import { METHOD_PATH } from "../lib/site"
import { planTakeaway } from "../lib/takeaways"
import type { PeakWindowKey, PlanPeak } from "../lib/types"
import DataSection from "./DataSection.svelte"
import PlanBars from "./PlanBars.svelte"
import PlanPeaks from "./PlanPeaks.svelte"

let {
	plans,
	ranked,
	day,
	planSince,
}: {
	plans: PlanPeak[]
	ranked: { plan: string; cacheRead?: number | null }[]
	day: string
	planSince: Record<string, string>
} = $props()

let selected = $state<PeakWindowKey>("sevenDays")
let unit = $state<PlanUnit>("tokens")
const bars = $derived(planBars(plans, { day, planSince, window: selected, unit }))
const takeaway = $derived(planTakeaway(bars, selected, unit))
</script>

<DataSection
	id="plans"
	title="Limits"
	href={`${METHOD_PATH}#plans`}
	direction="Higher is better."
	{takeaway}
>
	{#snippet chart()}
		<PlanBars {bars} {selected} {unit} onWindow={(key) => (selected = key)} onUnit={(key) => (unit = key)} />
		{#if plans.length > 0}
			<details class="table-details">
				<summary>Show the table</summary>
				<PlanPeaks {plans} {ranked} {day} {planSince} heading={false} />
			</details>
		{/if}
	{/snippet}
	{#snippet notes()}
		<p>
			A bar is the plan's estimated 100% from its own usage meter when it has one: tokens used ÷
			points the meter moved × 100. A hatched bar is the most we used once the window was full,
			a lower bound and not the plan's limit. A stub still filling shows the days seen. With
			cache counts cache reads in full; API $ prices every token at its model's list price, so
			cache reads count at their real weight. An estimate is rough until it has 3 points of
			meter over at least 24 hours. Every figure is measured by us.
		</p>
		<p>
			Tiers are the ones each plan runs on today. The table's other tiers are estimated from a
			measured tier times the multiplier its vendor states. The reasoning is in
			<a href={`${METHOD_PATH}#plans`}>Limits</a>.
		</p>
	{/snippet}
</DataSection>
