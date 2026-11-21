<script lang="ts">
import type { Read, TxList } from "../../lib/contract"
import {
	accountOptions,
	describePeriod,
	filterTransactions,
	type TransactionFilter,
	transactionRows,
} from "../../lib/view/ledger/transactions"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import TransactionCards from "./TransactionCards.svelte"
import TransactionFilters from "./TransactionFilters.svelte"
import TransactionTable from "./TransactionTable.svelte"

interface Props {
	read: Read<TxList>
	filter: TransactionFilter
	onAccount: (value: string) => void
	onMemo: (value: string) => void
}

let { read, filter, onAccount, onMemo }: Props = $props()

function clearFilters(): void {
	onAccount("")
	onMemo("")
}
</script>

<!-- The transactions Read as a filterable table, with its period and its command. -->
<ReadView {read} label="The transactions">
	{#snippet children(list)}
		{@const rows = transactionRows(list)}
		{@const shown = filterTransactions(rows, filter)}
		<div class="space-y-4">
			<TransactionFilters
				options={accountOptions(rows, filter.account)}
				account={filter.account}
				memo={filter.memo}
				{onAccount}
				{onMemo}
			/>
			<p class="text-sm text-muted-foreground">{`Showing ${shown.length} of ${rows.length} transactions, from ${describePeriod(read.argv)}.`}</p>
			{#if rows.length === 0}
				<EmptyState title="No transactions in this period">
					<p>The Snapshot holds no transaction between its two dates.</p>
				</EmptyState>
			{:else if shown.length === 0}
				<EmptyState title="No transaction matches these filters">
					<button
						type="button"
						onclick={clearFilters}
						class="text-accent underline-offset-4 hover:underline">Clear the filters</button
					>
				</EmptyState>
			{:else}
				<div class="hidden sm:block">
					<TransactionTable rows={shown} />
				</div>
				<div class="sm:hidden">
					<TransactionCards rows={shown} />
				</div>
			{/if}
			<Provenance argv={read.argv} />
		</div>
	{/snippet}
</ReadView>
