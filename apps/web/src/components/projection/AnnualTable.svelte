<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { formatDate } from "../../lib/format"
import { agesText } from "../../lib/view/household/model"
import type { AnnualRow } from "../../lib/view/projection/annual"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rows: readonly AnnualRow[]
	currency: string
}

/** The annual roll-up: one row per year, with a mark on the year the Projection ended in part. */
let { rows, currency }: Props = $props()

const columns: Column<AnnualRow>[] = [
	{ key: "period", header: "Period", cell: period },
	{ key: "opening", header: "Opening net worth", numeric: true, cell: opening },
	{ key: "closing", header: "Closing net worth", numeric: true, cell: closing },
	{ key: "income", header: "Income", numeric: true, cell: income },
	{ key: "expense", header: "Expense", numeric: true, cell: expense },
	{ key: "contributions", header: "Contributions", numeric: true, cell: contributions },
	{ key: "unfunded", header: "Unfunded contributions", numeric: true, cell: unfunded },
	{ key: "interest", header: "Interest", numeric: true, cell: interest },
	{ key: "unmet", header: "Unmet", numeric: true, cell: unmet },
	{ key: "ages", header: "Ages", cell: ages },
	{ key: "real", header: "Net worth in today's money", numeric: true, cell: real },
]
</script>

{#snippet period(row: AnnualRow)}
	{formatDate(row.from)} – {formatDate(row.to)}
	{#if row.partial}
		<span class="mt-1 block"><Badge>Partial year</Badge></span>
	{/if}
{/snippet}

{#snippet opening(row: AnnualRow)}<Money amount={row.openingNetWorth} />{/snippet}
{#snippet closing(row: AnnualRow)}<Money amount={row.closingNetWorth} />{/snippet}
{#snippet income(row: AnnualRow)}<Money amount={row.income} />{/snippet}
{#snippet expense(row: AnnualRow)}<Money amount={row.expense} />{/snippet}
{#snippet contributions(row: AnnualRow)}<Money amount={row.contributions} />{/snippet}
{#snippet unfunded(row: AnnualRow)}<Money amount={row.unfundedContributions} />{/snippet}
{#snippet interest(row: AnnualRow)}<Money amount={row.interest} />{/snippet}
{#snippet unmet(row: AnnualRow)}<Money amount={row.unmet} />{/snippet}
{#snippet ages(row: AnnualRow)}{agesText(row.ages, currentItemNames().people) || "—"}{/snippet}

{#snippet real(row: AnnualRow)}
	<Money amount={row.realNetWorth.amount} />
	<span class="block text-xs text-muted-foreground">at {formatDate(row.realNetWorth.date)}</span>
{/snippet}

<DataTable
	caption={`Each year, in ${currency}`}
	{columns}
	{rows}
	rowKey={(row) => String(row.index)}
/>
