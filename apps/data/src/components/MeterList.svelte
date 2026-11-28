<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.

import { exactMinute, relativeAge } from "../lib/collectors"
import { planName } from "../lib/plans"
import type { Meter } from "../lib/types"
import PlanMark from "./PlanMark.svelte"

let { meters, nowMs }: { meters: Meter[]; nowMs: number } = $props()

function phrase(meter: Meter): string {
	if (meter.lastReadingAt === null) return "never read"
	const age = relativeAge(meter.lastReadingAt, nowMs)
	return meter.state === "stale" ? `last read ${age}` : `read ${age}`
}
</script>

{#if meters.length > 0}
	<section class="meters-panel" aria-labelledby="meters-title">
		<h2 id="meters-title" class="meters-title">Usage meters</h2>
		<ul class="meters-list">
			{#each meters as meter (meter.plan)}
				<li class="meters-row">
					<span class="meters-plan">
						<PlanMark plan={meter.plan} name={planName(meter.plan)} size={20} />
						<span class="meters-name">{planName(meter.plan)}</span>
					</span>
					<span class="meters-status">
						<span class={`meters-dot meters-dot-${meter.state}`} aria-hidden="true"></span>
						{#if meter.lastReadingAt === null}
							<span class="meters-phrase meters-phrase-missing">{phrase(meter)}</span>
						{:else}
							<span
								class={`meters-phrase meters-phrase-${meter.state}`}
								title={exactMinute(meter.lastReadingAt)}>{phrase(meter)}</span
							>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
		{#if meters.some((meter) => meter.state !== "fresh")}
			<p class="meters-hint">
				A meter stops when the tool's sign-in on the collecting machine expires. Open the tool
				there, then the next hourly run reads it.
			</p>
		{/if}
	</section>
{/if}
