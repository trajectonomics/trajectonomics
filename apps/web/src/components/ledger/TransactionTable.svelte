<script lang="ts">
import { formatDate } from "../../lib/format"
import type { TransactionRow } from "../../lib/view/ledger/transactions"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly TransactionRow[]
}

let { rows }: Props = $props()

const columns: Column<TransactionRow>[] = [
	{ key: "date", header: "Date", cell: dateCell },
	{ key: "memo", header: "Memo", cell: memoCell },
	{ key: "postings", header: "Postings", cell: postingsCell },
]
</script>

{#snippet dateCell(row: TransactionRow)}{formatDate(row.date)}{/snippet}

{#snippet memoCell(row: TransactionRow)}
	{#if row.memo === null}
		<span class="text-muted-foreground">No memo</span>
	{:else}
		{row.memo}
	{/if}
{/snippet}

{#snippet postingsCell(row: TransactionRow)}
	<ul class="space-y-1">
		{#each row.postings as posting (posting.key)}
			<li class="flex justify-between gap-6">
				<span>{posting.account}</span>
				<Money amount={posting.amount} currency={posting.currency} />
			</li>
		{/each}
	</ul>
{/snippet}

<!-- The transactions as a table, for a screen wide enough to hold the postings beside the memo. -->
<DataTable caption="Transactions" {rows} rowKey={(row) => row.id} {columns} />
