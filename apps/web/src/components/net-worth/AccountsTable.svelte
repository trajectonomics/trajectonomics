<script lang="ts">
import type { AmountRow } from "../../lib/contract"
import { accountTypeLabel } from "../../lib/view/net-worth/account-type"
import AccountName from "../ui/AccountName.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly AmountRow[]
}

let { rows }: Props = $props()
const columns: Column<AmountRow>[] = [
	{ key: "account", header: "Account", cell: accountCell },
	{ key: "type", header: "Type", cell: typeCell },
	{ key: "amount", header: "Amount", numeric: true, cell: amountCell },
]
</script>

{#snippet accountCell(row: AmountRow)}<AccountName id={row.account.id} name={row.account.name} />{/snippet}
{#snippet typeCell(row: AmountRow)}{accountTypeLabel(row.type)}{/snippet}
{#snippet amountCell(row: AmountRow)}<Money amount={row.amount} currency={row.currency} />{/snippet}

<!-- Every row of the net worth report: account, type and amount, as the CLI states them. -->
<DataTable
	caption="Every account in net worth"
	{rows}
	{columns}
	rowKey={(row) => `${row.account.id}:${row.currency}`}
/>
