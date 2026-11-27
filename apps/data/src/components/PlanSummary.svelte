<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { compactCount } from "../lib/format"
import { grandTotal } from "../lib/grand-total"
import { type PlanTotal, planNote } from "../lib/plan-totals"

let { totals }: { totals: PlanTotal[] } = $props()

const grand = $derived(grandTotal(totals))
const inUse = $derived(totals.filter((total) => total.inUse).length)
const topRate = $derived(totals[0]?.tokensPerActiveDay ?? 0)
const mostUsed = $derived(topRate === 0 ? "–" : (totals[0]?.planName ?? "–"))
</script>

<div class="plan-summary">
	<dl class="kpi-row">
		<div class="kpi">
			<dt class="kpi-label">Plans in use</dt>
			<dd class="kpi-value">{inUse} of {totals.length}</dd>
		</div>
		<div class="kpi">
			<dt class="kpi-label">Tokens in the last 30 days</dt>
			<dd class="kpi-value">{compactCount(grand.tokensTotal)}</dd>
		</div>
		<div class="kpi">
			<dt class="kpi-label">Most used plan</dt>
			<dd class="kpi-value kpi-name">{mostUsed}</dd>
		</div>
	</dl>

	<ol class="meter-list">
		{#each totals as total}
			{@const note = planNote(total)}
			<li class="meter-row">
				<div class="meter-identity">
					<span class="meter-name">{total.planName}</span>
					{#if total.inUse}
						<span class="use-tag">In use</span>
					{:else}
						<span class="meter-last">Last used {total.lastDay ?? "–"}</span>
					{/if}
				</div>
				<div class="meter-track" aria-hidden="true">
					<div
						class="meter-bar"
						style={`width: ${topRate === 0 ? 0 : Math.round((total.tokensPerActiveDay / topRate) * 100)}%`}
					></div>
				</div>
				<span class="meter-figure">{compactCount(total.tokensPerActiveDay)} tokens a day</span>
				<p class="meter-detail">
					{compactCount(total.tokensTotal)} in {total.activeDays} active day{total.activeDays === 1
						? ""
						: "s"}
					{#if total.busiestDay !== null}
						· busiest day {compactCount(total.busiestDay.tokens)} on {total.busiestDay.day}
					{/if}
					· {compactCount(total.requests)} requests
					{#if note !== null} · {note}{/if}
				</p>
			</li>
		{/each}
	</ol>

	<p class="summary-note">
		"A day" means a day we used the plan. These are tokens we used, not the plan's limit. Most
		tokens are cache reads: context the model re-reads, which plans count cheaply.
	</p>
</div>
