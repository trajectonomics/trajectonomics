<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { compactCount, displayCount } from "../lib/format"
import { grandTotal } from "../lib/grand-total"
import { IN_USE_DAYS, type PlanTotal } from "../lib/plan-totals"
import { WINDOW_DAYS } from "../lib/window"
import PlanMark from "./PlanMark.svelte"

let { totals }: { totals: PlanTotal[] } = $props()

const grand = $derived(grandTotal(totals))
const topRate = $derived(totals[0]?.tokensPerActiveDay ?? 0)
</script>

<div class="plan-summary">
	<div class="summary-key">
		<p class="use-key">
			<span class="use-dot" aria-hidden="true"></span>in use in the last {IN_USE_DAYS} days
		</p>
		<p class="use-key" title={`${displayCount(grand.tokensTotal)} tokens`}>
			{compactCount(grand.tokensTotal)} tokens · {WINDOW_DAYS} days
		</p>
	</div>

	<ol class="meter-list">
		{#each totals as total}
			{@const width = topRate === 0 ? 0 : Math.round((total.tokensPerActiveDay / topRate) * 100)}
			<li
				class="meter-row"
				class:meter-dim={!total.inUse}
				title={total.inUse ? undefined : `Last used ${total.lastDay ?? "–"}`}
			>
				<div class="meter-identity">
					<PlanMark plan={total.plan} name={total.planName} />
					<span class="meter-name">{total.planName}</span>
					{#if total.inUse}
						<span class="use-dot" aria-hidden="true"></span>
						<span class="visually-hidden">In use</span>
					{:else}
						<span class="visually-hidden">Last used {total.lastDay ?? "–"}</span>
					{/if}
				</div>
				<div class="meter-track" aria-hidden="true">
					<div class="meter-bar" style={`width: ${width}%`}></div>
				</div>
				<span class="meter-figure" title={`${displayCount(Math.floor(total.tokensPerActiveDay))} tokens a day`}>
					<span aria-hidden="true">
						{compactCount(total.tokensPerActiveDay)}<span class="meter-unit">/day</span>
					</span>
					<span class="visually-hidden">
						{compactCount(total.tokensPerActiveDay)} tokens a day
					</span>
				</span>
			</li>
		{/each}
	</ol>

	<p class="summary-note">Tokens per day of use · what we used, not the plan's limit</p>
</div>
