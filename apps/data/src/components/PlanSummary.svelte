<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { displayCount, displayShare } from "../lib/format"
import { grandTotal, type PlanTotal } from "../lib/plan-totals"
import { rowNote } from "../lib/table"

let { totals, from, to }: { totals: PlanTotal[]; from: string; to: string } = $props()

const grand = $derived(grandTotal(totals))
const grandShare = $derived(grand.tokensTotal === 0 ? 0 : 1)
</script>

<div class="table-block">
	<p class="totals-caption">Totals from {from} to {to}. {totals.length} plans.</p>
	<p class="scroll-hint">Scroll the table sideways to see every column.</p>
	<div class="table-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region is focusable so the keyboard can pan the table. -->
		<div class="table-scroll" role="region" aria-label="Token totals per plan" tabindex="0">
			<table class="usage-table plan-table">
				<caption class="visually-hidden">
					Token totals per plan from {from} to {to}, {totals.length} plans.
				</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col" class="number">Total tokens</th>
						<th scope="col" class="number">Share</th>
						<th scope="col" class="number">Requests</th>
						<th scope="col" class="number">Models</th>
					</tr>
				</thead>
				<tbody>
					{#each totals as total}
						{@const note = rowNote(total)}
						<tr>
							<th scope="row">
								{total.planName}
								{#if note !== null}<span class="row-note">{note}</span>{/if}
							</th>
							<td class="number">{displayCount(total.tokensTotal)}</td>
							<td class="number">{displayShare(total.share)}</td>
							<td class="number">{displayCount(total.requests)}</td>
							<td class="number">{displayCount(total.models)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<th scope="row">All plans</th>
						<td class="number">{displayCount(grand.tokensTotal)}</td>
						<td class="number">{displayShare(grandShare)}</td>
						<td class="number">{displayCount(grand.requests)}</td>
						<td class="number"></td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>
