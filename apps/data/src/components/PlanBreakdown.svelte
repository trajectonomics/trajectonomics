<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { compactCount, displayCount } from "../lib/format"
import { grandTotal } from "../lib/grand-total"
import type { PlanTotal } from "../lib/plan-totals"

let { totals, from, to }: { totals: PlanTotal[]; from: string; to: string } = $props()

const grand = $derived(grandTotal(totals))
const count = $derived(totals.length === 1 ? "1 plan" : `${totals.length} plans`)
</script>

{#snippet breakdownCell(value: number | null)}
	{#if value === null}
		<td class="number">
			<span aria-hidden="true">–</span><span class="visually-hidden">not reported</span>
		</td>
	{:else}
		<td class="number" title={displayCount(value)}>{compactCount(value)}</td>
	{/if}
{/snippet}

<div class="table-block">
	<p class="totals-caption">
		Totals from {from} to {to}. {count}, ranked by tokens a day. Input, output and cache sums
		include only plans that report a breakdown.
	</p>
	<p class="scroll-hint">Scroll the table sideways to see every column.</p>
	<div class="table-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region is focusable so the keyboard can pan the table. -->
		<div class="table-scroll" role="region" aria-label="Token breakdown per plan" tabindex="0">
			<table class="usage-table breakdown-table">
				<caption class="visually-hidden">
					Token totals per plan from {from} to {to}, {count}, ranked by tokens a day. Input,
					output and cache sums include only plans that report a breakdown.
				</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col" class="number">Active days</th>
						<th scope="col" class="number">Total tokens</th>
						<th scope="col" class="number">Input</th>
						<th scope="col" class="number">Output</th>
						<th scope="col" class="number">Cache read</th>
						<th scope="col" class="number">Cache write</th>
						<th scope="col" class="number">Requests</th>
					</tr>
				</thead>
				<tbody>
					{#each totals as total}
						<tr>
							<th scope="row">{total.planName}</th>
							<td class="number">{displayCount(total.activeDays)}</td>
							<td class="number" title={displayCount(total.tokensTotal)}>
								{compactCount(total.tokensTotal)}
							</td>
							{@render breakdownCell(total.tokensIn)}
							{@render breakdownCell(total.tokensOut)}
							{@render breakdownCell(total.cacheRead)}
							{@render breakdownCell(total.cacheWrite)}
							<td class="number" title={displayCount(total.requests)}>
								{compactCount(total.requests)}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<th scope="row">All plans</th>
						<td class="number">{displayCount(grand.activeDays)}</td>
						<td class="number" title={displayCount(grand.tokensTotal)}>
							{compactCount(grand.tokensTotal)}
						</td>
						{@render breakdownCell(grand.tokensIn)}
						{@render breakdownCell(grand.tokensOut)}
						{@render breakdownCell(grand.cacheRead)}
						{@render breakdownCell(grand.cacheWrite)}
						<td class="number" title={displayCount(grand.requests)}>
							{compactCount(grand.requests)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>
