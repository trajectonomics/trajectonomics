<script lang="ts">
import type { CarryInRow } from "../../lib/view/tax"
import Money from "../ui/Money.svelte"

interface Props {
	rows: readonly CarryInRow[]
	currency: string
}

let { rows, currency }: Props = $props()
</script>

<!--
	The Carry-in records the result echoes: for each period, its source, what it had prepaid, and each
	tallied class. Each record is a block, so its amounts wrap on a narrow screen instead of squeezing.
-->
<section aria-labelledby="carry-in-title" class="space-y-3">
	<h2 id="carry-in-title" class="text-base font-semibold">
		Carry-in records, figures in {currency}
	</h2>
	{#each rows as row (row.key)}
		<article class="rounded-lg border border-border p-4 text-sm">
			<p class="font-medium">{row.levy}, period starts {row.periodStart}</p>
			<p class="mt-1 text-muted-foreground">Source: {row.source}</p>
			<p class="mt-2 flex justify-between gap-4">
				<span>Prepaid</span>
				<Money amount={row.prepaid} />
			</p>
			<ul class="mt-3 space-y-1 border-t border-border pt-3">
				{#each row.tallies as tally (tally.key)}
					<li class="flex justify-between gap-4">
						<span class="min-w-0 break-words">
							{tally.label} <span class="text-muted-foreground">({tally.basis})</span>
						</span>
						<Money amount={tally.amount} />
					</li>
				{/each}
			</ul>
		</article>
	{/each}
</section>
