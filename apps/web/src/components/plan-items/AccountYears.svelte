<script lang="ts">
import { formatDate } from "../../lib/format/date"
import type { AccountYear } from "../../lib/view/plan-items/account-years"
import Money from "../ui/Money.svelte"

interface Props {
	/** The roll-ups in which `traj` states a payout or a fee for the Account. */
	years: readonly AccountYear[]
	currency: string
}

/** What `traj projection run` states for the Account year by year. The page adds nothing: the engine states no lifetime total. */
let { years, currency }: Props = $props()
const hasPayout = $derived(years.some((year) => year.payout !== null))
const hasFee = $derived(years.some((year) => year.fee !== null))
</script>

{#if years.length > 0}
	<details class="mt-3 text-sm">
		<summary class="cursor-pointer rounded-md py-1 outline-none focus-visible:outline-2 focus-visible:outline-ring">Year by year, as traj states it</summary>
		<div class="mt-2 max-w-full overflow-x-auto">
			<table class="w-full min-w-max border-collapse text-sm">
				<thead>
					<tr>
						<th scope="col" class="py-1 pr-3 text-left font-medium text-muted-foreground">Year</th>
						{#if hasPayout}<th scope="col" class="py-1 pl-3 text-right font-medium text-muted-foreground">Paid out</th>{/if}
						{#if hasFee}<th scope="col" class="py-1 pl-3 text-right font-medium text-muted-foreground">Fee</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each years as year (year.index)}
						<tr class="border-t border-border">
							<th scope="row" class="py-1 pr-3 text-left font-normal">{formatDate(year.from)} to {formatDate(year.to)}</th>
							{#if hasPayout}<td class="py-1 pl-3 text-right tabular-nums">{#if year.payout !== null}<Money amount={year.payout} {currency} />{/if}</td>{/if}
							{#if hasFee}<td class="py-1 pl-3 text-right tabular-nums">{#if year.fee !== null}<Money amount={year.fee} {currency} />{/if}</td>{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
{/if}
