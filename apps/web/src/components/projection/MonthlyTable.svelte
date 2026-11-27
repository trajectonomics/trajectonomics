<script lang="ts">
import { formatDate } from "../../lib/format"
import type { MonthlyRow } from "../../lib/view/projection/annual"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly MonthlyRow[]
	count: number
}

/** The monthly rows, behind a disclosure: the CLI ran the Projection with `--monthly`. */
let { rows, count }: Props = $props()

const columns: Column<MonthlyRow>[] = [
	{ key: "date", header: "Date", cell: date },
	{ key: "netWorth", header: "Net worth", numeric: true, cell: netWorth },
	{ key: "real", header: "Net worth in today's money", numeric: true, cell: real },
	{ key: "accessible", header: "Accessible net worth", numeric: true, cell: accessible },
	{
		key: "realAccessible",
		header: "Accessible net worth in today's money",
		numeric: true,
		cell: realAccessible,
	},
]
</script>

{#snippet date(row: MonthlyRow)}{formatDate(row.date)}{/snippet}
{#snippet netWorth(row: MonthlyRow)}<Money amount={row.netWorth} />{/snippet}
{#snippet real(row: MonthlyRow)}<Money amount={row.realNetWorth} />{/snippet}
{#snippet accessible(row: MonthlyRow)}<Money amount={row.accessibleNetWorth} />{/snippet}
{#snippet realAccessible(row: MonthlyRow)}<Money amount={row.realAccessibleNetWorth} />{/snippet}

<details class="rounded-lg border border-border p-4">
	<summary class="cursor-pointer text-sm font-medium">Monthly rows ({count})</summary>
	<div class="mt-4">
		<DataTable caption="Each month" {columns} {rows} rowKey={(row) => row.date} />
	</div>
</details>
