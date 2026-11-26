<script lang="ts">
import { type ItemNames, itemText } from "../../lib/view/item-names"
import type { Terms } from "../../lib/view/projection/terms"
import type { RuleYearRow, RuleYears } from "../../lib/view/withdrawals/years"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	rule: RuleYears
	currency: string
	terms: Terms
	/** The plan's names by id, for the caption naming the rule Flow. */
	names: ItemNames
}

/** What one rule pays in each of its years: the amount it fixed, what was paid, its share of the savings and why. */
let { rule, currency, terms, names }: Props = $props()

const columns: Column<RuleYearRow>[] = [
	{ key: "from", header: "Year from", cell: from },
	{ key: "portfolio", header: "Savings it read", numeric: true, cell: portfolio },
	{ key: "amount", header: "Amount for the year", numeric: true, cell: amount },
	{ key: "paid", header: "Paid", numeric: true, cell: paid },
	{ key: "share", header: "Share of savings", numeric: true, cell: share },
	{ key: "action", header: "What the rule did", cell: action },
]
</script>

{#snippet from(row: RuleYearRow)}{row.from}{/snippet}
{#snippet portfolio(row: RuleYearRow)}<Money amount={row.portfolio} />{/snippet}

{#snippet amount(row: RuleYearRow)}
	<Money amount={terms === "real" ? row.realAmount : row.amount} />
	{#if terms === "both"}<span class="block text-xs text-muted-foreground">in today's money <Money amount={row.realAmount} /></span>{/if}
{/snippet}

{#snippet paid(row: RuleYearRow)}
	<Money amount={terms === "real" ? row.realPaid : row.paid} />
	{#if terms === "both"}<span class="block text-xs text-muted-foreground">in today's money <Money amount={row.realPaid} /></span>{/if}
{/snippet}

{#snippet share(row: RuleYearRow)}{row.share ?? "No savings left"}{/snippet}

{#snippet action(row: RuleYearRow)}
	{#if row.marked}<Badge tone="accent">{row.action}</Badge>{:else}{row.action}{/if}
{/snippet}

<DataTable caption={`${itemText(names, "flow", rule.flow)}, each year in ${currency}`} {columns} rows={rule.rows} rowKey={(row) => row.key} />
