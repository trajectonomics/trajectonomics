<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { cacheShareLabel, NO_CACHE_SPLIT } from "../lib/cache-share"
import { daysCollected, shortDay } from "../lib/collecting"
import { compactCount, displayCount } from "../lib/format"
import { grandTotal } from "../lib/grand-total"
import { planModels } from "../lib/plan-models"
import { planTier } from "../lib/plan-tier"
import { IN_USE_DAYS, type PlanTotal } from "../lib/plan-totals"
import type { UsageRow } from "../lib/types"
import { WINDOW_DAYS } from "../lib/window"
import PlanMark from "./PlanMark.svelte"

let {
	totals,
	rows,
	day,
	since = null,
}: { totals: PlanTotal[]; rows: UsageRow[]; day: string; since?: string | null } = $props()

const grand = $derived(grandTotal(totals))
const topRate = $derived(totals[0]?.tokensPerActiveDay ?? 0)
/** How many UTC days collection covers, or null on a health body that does not say. */
const collected = $derived(since === null ? null : daysCollected(since, day))
const short = $derived(since !== null && collected !== null && collected < WINDOW_DAYS)
const onlyDay = $derived(collected === 1)
</script>

<div class="plan-summary">
	<div class="summary-key">
		<p class="use-key">
			<span class="use-dot" aria-hidden="true"></span>in use in the last {IN_USE_DAYS} days
		</p>
		<p
			class="use-key"
			title={`${displayCount(grand.tokensUncached)} tokens without cache reads ${short && since !== null ? `since ${shortDay(since)}` : `over ${WINDOW_DAYS} days`}`}
		>
			{compactCount(grand.tokensUncached)} tokens ·
			{short && since !== null ? `since ${shortDay(since)}` : `${WINDOW_DAYS} days`}
		</p>
	</div>

	<ol class="meter-list">
		{#each totals as total}
			{@const width = topRate === 0 ? 0 : Math.round((total.tokensPerActiveDay / topRate) * 100)}
			{@const tier = planTier(total.plan, day)}
			{@const cache = total.cacheRead === null ? NO_CACHE_SPLIT : cacheShareLabel(total.cacheReadShare)}
			{@const models = planModels(rows, total.plan)}
			{@const modelMax = models[0]?.tokens ?? 0}
			<li
				class="meter-row"
				class:meter-dim={!total.inUse}
				title={total.inUse ? undefined : `Last used ${total.lastDay ?? "–"}`}
			>
				<div class="meter-identity">
					<PlanMark plan={total.plan} name={total.planName} />
					<span class="meter-name">{total.planName}</span>
					{#if tier !== null}
						<span class="plan-tier" title={tier.note ?? undefined}>{tier.name}{#if tier.note}<span class="visually-hidden">{`, ${tier.note}`}</span>{/if}</span>
					{/if}
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
				<span
					class="meter-figure"
					title={onlyDay
						? `${displayCount(total.tokensUncached)} tokens so far today without cache reads`
						: `${displayCount(Math.floor(total.tokensPerActiveDay))} tokens a day without cache reads`}
				>
					{#if onlyDay}
						<span aria-hidden="true">
							{compactCount(total.tokensUncached)}<span class="meter-unit"> so far today</span>
						</span>
						<span class="visually-hidden">
							{compactCount(total.tokensUncached)} tokens so far today without cache reads
						</span>
					{:else}
						<span aria-hidden="true">
							{compactCount(total.tokensPerActiveDay)}<span class="meter-unit">/day</span>
						</span>
						<span class="visually-hidden">
							{compactCount(total.tokensPerActiveDay)} tokens a day without cache reads
						</span>
					{/if}
					{#if cache !== null}
						<span class="meter-cache">{cache}</span>
					{/if}
				</span>
				<details class="meter-models">
					<summary class="meter-models-toggle">
						Models<span class="visually-hidden"> of {total.planName}</span>
					</summary>
					<ol class="model-list">
						{#each models as model (model.model)}
							{@const modelCache = model.cacheRead === null ? NO_CACHE_SPLIT : cacheShareLabel(model.cacheReadShare)}
							{@const modelWidth = modelMax === 0 ? 0 : Math.round((model.tokens / modelMax) * 100)}
							<li class="model-row">
								<span class="model-identity">
									<span class="model-name">{model.model}</span>
									{#if modelCache !== null}
										<span class="model-cache">{modelCache}</span>
									{/if}
								</span>
								<span class="meter-track" aria-hidden="true">
									<span class="meter-bar" style={`width: ${modelWidth}%`}></span>
								</span>
								<span
									class="model-figure"
									title={`${displayCount(model.tokens)} tokens without cache reads`}
								>
									{compactCount(model.tokens)}<span class="visually-hidden"> tokens</span>
								</span>
							</li>
						{/each}
					</ol>
				</details>
			</li>
		{/each}
	</ol>

	<p class="summary-note">Tokens per day of use · what we used, not the plan's limit</p>
</div>
