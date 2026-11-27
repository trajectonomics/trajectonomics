<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.

import type { CachePlanRow } from "../lib/cache-rate"
import { NO_CACHE_SPLIT } from "../lib/cache-share"
import { displayCount } from "../lib/format"
import PlanMark from "./PlanMark.svelte"

let { rows, from, to }: { rows: CachePlanRow[]; from: string; to: string } = $props()

function rateLabel(rate: number | null): string {
	return rate === null ? NO_CACHE_SPLIT : `${Math.round(rate * 100)}%`
}
</script>

<div class="cache-block">
	<p class="totals-caption">
		Cache rate is cache reads as a share of all tokens, from {from} to {to}. Highest first.
	</p>
	<p class="scroll-hint">Scroll the table sideways to see every column.</p>
	<div class="table-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region is focusable so the keyboard can pan the table. -->
		<div class="table-scroll" role="region" aria-label="Cache rate table" tabindex="0">
			<table class="usage-table cache-table">
				<caption class="visually-hidden">
					Cache rate per plan and model, from {from} to {to}, highest first.
				</caption>
				<thead>
					<tr>
						<th scope="col">Plan</th>
						<th scope="col" class="number">Input</th>
						<th scope="col" class="number">Output</th>
						<th scope="col" class="number">Cache read</th>
						<th scope="col" class="number">Cache write</th>
						<th scope="col" class="number">Cache rate</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.plan)}
						<tr>
							<th scope="row">
								<span class="cache-plan">
									<PlanMark plan={row.plan} name={row.planName} size={20} />
									<span>{row.planName}</span>
								</span>
								{#if row.models.length > 0}
									<details class="cache-models">
										<summary>Models</summary>
										<table class="cache-model-table">
											<caption class="visually-hidden">
												{row.planName}'s models and their cache rates
											</caption>
											<thead>
												<tr>
													<th scope="col">Model</th>
													<th scope="col" class="number">Input</th>
													<th scope="col" class="number">Output</th>
													<th scope="col" class="number">Cache read</th>
													<th scope="col" class="number">Cache write</th>
													<th scope="col" class="number">Cache rate</th>
												</tr>
											</thead>
											<tbody>
												{#each row.models as model (model.model)}
													<tr>
														<th scope="row"><span class="model-name">{model.model}</span></th>
														<td class="number">{displayCount(model.tokensIn)}</td>
														<td class="number">{displayCount(model.tokensOut)}</td>
														<td class="number">{displayCount(model.cacheRead)}</td>
														<td class="number">{displayCount(model.cacheWrite)}</td>
														<td class="number">{rateLabel(model.rate)}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</details>
								{/if}
							</th>
							<td class="number">{displayCount(row.tokensIn)}</td>
							<td class="number">{displayCount(row.tokensOut)}</td>
							<td class="number">{displayCount(row.cacheRead)}</td>
							<td class="number">{displayCount(row.cacheWrite)}</td>
							<td class="number">{rateLabel(row.rate)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
