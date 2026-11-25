<script lang="ts">
import type { AmountRow } from "../../lib/contract"
import AccountName from "../ui/AccountName.svelte"
import DirectedMoney from "../ui/DirectedMoney.svelte"

interface Props {
	rows: readonly AmountRow[]
}

let { rows }: Props = $props()
</script>

<!-- The liability accounts, each read as what you owe. The ledger's signed figure stays in the title. -->
<div class="space-y-2">
	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">No liability accounts.</p>
	{:else}
		<ul class="divide-y divide-border text-sm">
			{#each rows as row (`${row.account.id}:${row.currency}`)}
				<li class="flex items-center justify-between gap-3 py-2">
					<span class="min-w-0 truncate"><AccountName id={row.account.id} name={row.account.name} /></span>
					<span class="shrink-0">
						<DirectedMoney amount={row.amount} currency={row.currency} direction="liability" />
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
