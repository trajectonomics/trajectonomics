<script lang="ts">
import type { RateRow } from "../../lib/view/tax"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly RateRow[]
	currency: string
}

let { rows, currency }: Props = $props()

const columns: readonly Column<RateRow>[] = [
	{ key: "period", header: "Tax year", cell: periodCell },
	{ key: "assessable", header: "Assessable income", numeric: true, cell: assessableCell },
	{ key: "taxable", header: "Taxable income", numeric: true, cell: taxableCell },
	{ key: "tax", header: "Tax", numeric: true, cell: taxCell },
	{ key: "top", header: "Top rate", numeric: true, cell: topCell },
	{ key: "share", header: "Share of income paid", numeric: true, cell: shareCell },
]
</script>

{#snippet periodCell(row: RateRow)}{row.period}{/snippet}
{#snippet assessableCell(row: RateRow)}{#if row.assessable !== null}<Money amount={row.assessable} />{:else}<span class="text-muted-foreground">Not stated</span>{/if}{/snippet}
{#snippet taxableCell(row: RateRow)}{#if row.taxable !== null}<Money amount={row.taxable} />{:else}<span class="text-muted-foreground">Not stated</span>{/if}{/snippet}
{#snippet taxCell(row: RateRow)}<Money amount={row.tax} />{/snippet}
{#snippet topCell(row: RateRow)}{row.topRate ?? "Not stated"}{/snippet}
{#snippet shareCell(row: RateRow)}{row.shareOfIncome ?? "Not stated"}{/snippet}

<!-- One row per tax year: what was assessed, what was taxed, the tax and the two rates. -->
<DataTable
	caption={`Income, tax and rates by tax year, figures in ${currency}`}
	{columns}
	{rows}
	rowKey={(row) => row.key}
/>
