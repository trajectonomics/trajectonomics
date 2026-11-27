<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { displayCount, displayShare } from "../lib/format"
import { grandTotal, type PlanTotal, planNote } from "../lib/plan-totals"

let { totals, from, to }: { totals: PlanTotal[]; from: string; to: string } = $props()

const grand = $derived(grandTotal(totals))
const count = $derived(totals.length === 1 ? "1 plan" : `${totals.length} plans`)
</script>

<div class="table-block">
	<p class="totals-caption">Totals from {from} to {to}. {count}.</p>
	<p class="scroll-hint">Scroll the table sideways to see every column.</p>
	<div class="table-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region is focusable so the keyboard can pan the table. -->
		<div class="table-scroll" role="region" aria-label="Token totals per plan" tabindex="0">
			<table class="usage-table summary-table">
				<caption class="visually-hidden">Token totals per plan from {from} to {to}, {count}.</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col" class="number">Total tokens</th>
						<th scope="col" class="number">Share</th>
						<th scope="col" class="number">Requests</th>
						<th scope="col" class="number">Models</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each totals as total}
						{@const note = planNote(total)}
						<tr>
							<th scope="row">{total.planName}</th>
							<td class="number">{displayCount(total.tokensTotal)}</td>
							<td class="number">{displayShare(total.share)}</td>
							<td class="number">{displayCount(total.requests)}</td>
							<td class="number">{displayCount(total.models)}</td>
							<td>{#if note !== null}<span class="row-note">{note}</span>{/if}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<th scope="row">All plans</th>
						<td class="number">{displayCount(grand.tokensTotal)}</td>
						<td class="number">{displayShare(grand.share)}</td>
						<td class="number">{displayCount(grand.requests)}</td>
						<td class="number"><span aria-hidden="true">–</span><span class="visually-hidden">not totalled</span></td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>
