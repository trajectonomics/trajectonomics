<script lang="ts">
import { formatDate } from "../../lib/format"
import type { TransactionRow } from "../../lib/view/ledger/transactions"
import Money from "../ui/Money.svelte"

interface Props {
	rows: readonly TransactionRow[]
}

let { rows }: Props = $props()
</script>

<!-- The transactions as a stacked list, so a phone shows every amount without scrolling sideways. -->
<ul aria-label="Transactions" class="space-y-3">
	{#each rows as row (row.id)}
		<li class="space-y-2 rounded-lg border border-border p-3 text-sm">
			<div class="flex justify-between gap-3">
				<span class="font-medium tabular-nums">{formatDate(row.date)}</span>
				<span class="min-w-0 break-words text-right">
					{#if row.memo === null}
						<span class="text-muted-foreground">No memo</span>
					{:else}
						{row.memo}
					{/if}
				</span>
			</div>
			<ul class="space-y-1">
				{#each row.postings as posting (posting.key)}
					<li class="flex justify-between gap-4">
						<span class="min-w-0 break-words">{posting.account}</span>
						<Money amount={posting.amount} currency={posting.currency} />
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>
