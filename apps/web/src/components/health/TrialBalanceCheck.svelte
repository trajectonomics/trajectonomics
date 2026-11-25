<script lang="ts">
import type { Doctor } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"

type Total = NonNullable<NonNullable<Doctor["trialBalance"]>["totals"]>[number]

interface Props {
	trialBalance: Doctor["trialBalance"] | null
}

let { trialBalance }: Props = $props()

const columns: Column<Total>[] = [
	{ key: "currency", header: "Currency", cell: currencyCell },
	{ key: "debit", header: "Debit", numeric: true, cell: debitCell },
	{ key: "credit", header: "Credit", numeric: true, cell: creditCell },
]
</script>

{#snippet currencyCell(total: Total)}{total.currency}{/snippet}
{#snippet debitCell(total: Total)}<Money amount={total.debit} />{/snippet}
{#snippet creditCell(total: Total)}<Money amount={total.credit} />{/snippet}

<!-- Whether the trial balance balances at the doctor's As-of, with its totals. -->
{#if trialBalance === null || trialBalance === undefined}
	<p class="text-sm text-muted-foreground">The doctor did not check the trial balance.</p>
{:else}
	<div class="space-y-3">
		<div class="flex flex-wrap items-center gap-3">
			<Badge tone={trialBalance.balanced ? "neutral" : "accent"}>{trialBalance.balanced ? "Balances" : "Does not balance"}</Badge>
			<span class="text-sm text-muted-foreground">{`Trial balance at ${formatDate(trialBalance.asOf)}`}</span>
		</div>
		{#if trialBalance.totals === null}
			<p class="text-sm text-muted-foreground">
				The totals are not stated: every account is in range, but a column's sum exceeds the safe integer range. The debit and credit columns were still compared exactly.
			</p>
		{:else}
			<DataTable
				caption="Trial balance totals"
				rows={trialBalance.totals}
				rowKey={(total) => total.currency}
				{columns}
			/>
		{/if}
	</div>
{/if}
