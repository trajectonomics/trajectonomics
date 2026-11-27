<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { compactCount } from "../lib/format"
import { planSegments, SEGMENT_LABELS, shareSentence } from "../lib/plan-shares"
import type { PlanTotal } from "../lib/plan-totals"
import BreakdownNumbers from "./BreakdownNumbers.svelte"
import PlanMark from "./PlanMark.svelte"

let { totals, from, to }: { totals: PlanTotal[]; from: string; to: string } = $props()
</script>

<div class="share-block">
	<ul class="share-legend">
		{#each SEGMENT_LABELS as [key, label]}
			<li><span class="share-swatch swatch-{key}" aria-hidden="true"></span>{label}</li>
		{/each}
	</ul>

	<ol class="share-list">
		{#each totals as total}
			{@const segments = planSegments(total)}
			<li class="share-row">
				<div class="share-head">
					<PlanMark plan={total.plan} name={total.planName} size={20} />
					<span class="share-name">{total.planName}</span>
				</div>
				<div class="share-bar" class:share-bar-empty={segments.length === 0} aria-hidden="true">
					{#each segments as segment}
						<span
							class="share-segment swatch-{segment.key}"
							style={`flex: ${segment.share} 1 0`}
							title={`${segment.label} · ${compactCount(segment.tokens)} · ${Math.round(segment.share * 100)}%`}
						></span>
					{/each}
					{#if segments.length === 0}
						<span class="share-empty">not reported</span>
					{/if}
				</div>
				<span class="share-total">{compactCount(total.tokensTotal)}</span>
				<p class="visually-hidden">{shareSentence(total)}</p>
			</li>
		{/each}
	</ol>

	<BreakdownNumbers {totals} {from} {to} />
</div>
