<script lang="ts">
import type { AmountRow } from "../../lib/contract"
import Money from "../ui/Money.svelte"

interface Props {
	rows: readonly AmountRow[]
}

let { rows }: Props = $props()
</script>

<!-- The liability accounts with their amounts. The ledger states them negative, and they stay so. -->
<div class="space-y-2">
	<p class="text-sm text-muted-foreground">
		Liabilities, shown negative as the ledger states them: what you owe.
	</p>
	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">No liability accounts.</p>
	{:else}
		<ul class="divide-y divide-border text-sm">
			{#each rows as row (`${row.account.id}:${row.currency}`)}
				<li class="flex items-center justify-between gap-3 py-2">
					<span class="min-w-0 truncate">{row.account.name}</span>
					<span class="shrink-0">
						<Money amount={row.amount} currency={row.currency} />
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
