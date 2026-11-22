<script lang="ts">
import type { AccountGroup, AccountNode } from "../../lib/view/ledger/account-tree"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	group: AccountGroup
}

let { group }: Props = $props()

const TYPE_LABELS: Readonly<Record<AccountGroup["type"], string>> = {
	asset: "Assets",
	liability: "Liabilities",
	equity: "Equity",
	income: "Income",
	expense: "Expenses",
}

/** The indent of each depth of the tree. Written out in full so Tailwind keeps every class. */
const INDENT = ["pl-0", "pl-5", "pl-10", "pl-14"] as const

function indentOf(depth: number): string {
	return INDENT[Math.min(depth, INDENT.length - 1)] ?? "pl-0"
}

const columns: Column<AccountNode>[] = [
	{ key: "account", header: "Account", cell: accountCell },
	{ key: "balance", header: "Balance", numeric: true, cell: balanceCell },
]
</script>

{#snippet accountCell(node: AccountNode)}
	<div class="flex flex-wrap items-center gap-2 {indentOf(node.depth)}">
		<span>{node.name}</span>
		{#if !node.leaf}<Badge>Header</Badge>{/if}
		{#if node.archived}<Badge>Archived</Badge>{/if}
	</div>
{/snippet}

{#snippet balanceCell(node: AccountNode)}
	{#if node.leaf}
		{#if node.balances.length === 0}
			<span class="text-muted-foreground">No balance</span>
		{:else}
			<div class="space-y-1">
				{#each node.balances as line (line.currency)}
					<Money amount={line.amount} currency={line.currency} />
				{/each}
			</div>
		{/if}
	{/if}
{/snippet}

<!-- One account type's accounts as a table: the tree indented, and each leaf's balance. -->
<DataTable
	caption={TYPE_LABELS[group.type]}
	rows={group.nodes}
	rowKey={(node) => node.id}
	{columns}
/>
