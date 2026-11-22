<script lang="ts">
import type { PnlLine } from "../../lib/view/ledger/pnl"
import DataTable from "../ui/DataTable.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	caption: string
	lines: readonly PnlLine[]
	empty: string
}

let { caption, lines, empty }: Props = $props()

const columns: Column<PnlLine>[] = [
	{ key: "account", header: "Account", cell: accountCell },
	{ key: "amount", header: "Amount", numeric: true, cell: amountCell },
]
</script>

{#snippet accountCell(line: PnlLine)}{line.account}{/snippet}
{#snippet amountCell(line: PnlLine)}<Money amount={line.amount} currency={line.currency} />{/snippet}

{#if lines.length === 0}
	<EmptyState title={empty} />
{:else}
	<DataTable {caption} rows={lines} rowKey={(line) => line.key} {columns} />
{/if}
