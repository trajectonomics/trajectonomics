<script lang="ts">
import { formatMonth } from "../../lib/format"
import type { ScheduleYear } from "../../lib/view/plan-items/loan-statement"
import Money from "../ui/Money.svelte"

interface Props {
	/** The months of the loan, grouped by year, as the CLI's statement gives them. */
	years: readonly ScheduleYear[]
	currency: string
}

let { years, currency }: Props = $props()
</script>

<!-- The schedule: each month's rows as the CLI states them. A year's rows are shown, never summed here. -->
{#if years.length === 0}
	<p class="text-sm text-muted-foreground">No months in this Projection.</p>
{:else}
	<div class="mt-2 min-w-0 max-w-full space-y-4 overflow-x-auto">
		{#each years as year (year.year)}
			<section aria-label="Schedule {year.year}">
				<h4 class="text-sm font-medium">{year.year}</h4>
				<table class="mt-1 w-full text-xs">
					<thead>
						<tr class="text-left text-muted-foreground">
							<th scope="col" class="py-1 pr-2 font-normal">Month</th>
							<th scope="col" class="py-1 pr-2 font-normal">Opening</th>
							<th scope="col" class="py-1 pr-2 font-normal">Borrowed</th>
							<th scope="col" class="py-1 pr-2 font-normal">Interest</th>
							<th scope="col" class="py-1 pr-2 font-normal">Paid</th>
							<th scope="col" class="py-1 font-normal">Closing</th>
						</tr>
					</thead>
					<tbody>
						{#each year.rows as row (row.month)}
							<tr class="border-t border-border">
								<td class="py-1 pr-2">{formatMonth(row.month)}</td>
								<td class="py-1 pr-2"><Money amount={row.opening} {currency} /></td>
								<td class="py-1 pr-2"><Money amount={row.drawn} {currency} /></td>
								<td class="py-1 pr-2"><Money amount={row.interest} {currency} /></td>
								<td class="py-1 pr-2"><Money amount={row.paid} {currency} /></td>
								<td class="py-1"><Money amount={row.closing} {currency} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}
	</div>
{/if}
