<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { displayCount } from "../lib/format"
import { rowNote, type TableRow } from "../lib/table"

let { rows, from, to }: { rows: TableRow[]; from: string; to: string } = $props()
</script>

<div class="table-block">
	<p class="totals-caption">Totals from {from} to {to}. {rows.length} plan and model rows.</p>
	<p class="scroll-hint">Scroll the table sideways to see every column.</p>
	<div class="table-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region is focusable so the keyboard can pan the table. -->
		<div class="table-scroll" role="region" aria-label="Token totals table" tabindex="0">
			<table class="usage-table">
				<caption class="visually-hidden">
					Token totals from {from} to {to}, {rows.length} plan and model rows.
				</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col">Model</th>
						<th scope="col" class="number">Tokens in</th>
						<th scope="col" class="number">Tokens out</th>
						<th scope="col" class="number">Cache read</th>
						<th scope="col" class="number">Cache write</th>
						<th scope="col" class="number">Total tokens</th>
						<th scope="col" class="number">Requests</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as entry}
						{@const note = rowNote(entry)}
						<tr>
							<th scope="row">{entry.planName}</th>
							<td>
								<span class="model-name">{entry.model}</span>
								{#if note !== null}<span class="row-note">{note}</span>{/if}
							</td>
							<td class="number">{displayCount(entry.tokensIn)}</td>
							<td class="number">{displayCount(entry.tokensOut)}</td>
							<td class="number">{displayCount(entry.cacheRead)}</td>
							<td class="number">{displayCount(entry.cacheWrite)}</td>
							<td class="number">{displayCount(entry.tokensTotal)}</td>
							<td class="number">{displayCount(entry.requests)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
