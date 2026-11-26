<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import type { Pnl, Read } from "../../lib/contract"
import { type PnlView, pnlView } from "../../lib/view/ledger/pnl"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import type { Column } from "../ui/table-types"
import PnlLinesTable from "./PnlLinesTable.svelte"
import ReportSection from "./ReportSection.svelte"

interface Props {
	pnl: Read<Pnl>
}

let { pnl }: Props = $props()

type Total = PnlView["totals"][number]

const totalColumns: Column<Total>[] = [
	{ key: "currency", header: "Currency", cell: currencyCell },
	{ key: "total", header: "Total", numeric: true, cell: totalCell },
]
</script>

{#snippet currencyCell(total: Total)}{total.currency}{/snippet}
{#snippet totalCell(total: Total)}<Money amount={total.amount} />{/snippet}

<!-- Profit and loss over the period: income rows, expense rows, then the CLI's totals. -->
<ReportSection
	id="profit-and-loss"
	title="Profit and loss"
	intro="Income is negative and expense positive, as the ledger holds them. The total is the CLI's own figure, not a sum of these rows."
>
	<ReadView read={pnl} label="Profit and loss">
		{#snippet children(report)}
			{@const view = pnlView(report, currentAccountNames())}
			<div class="space-y-6">
				<p class="text-sm">
					<span class="text-muted-foreground">Period{" "}</span>{view.period}
					{#if view.project !== null}
						<span class="text-muted-foreground"> · project {view.project}</span>
					{/if}
				</p>
				<PnlLinesTable caption="Income" lines={view.income} empty="No income in this period." />
				<PnlLinesTable caption="Expenses" lines={view.expense} empty="No expenses in this period." />
				{#if view.note}
					<p class="rounded-md border border-border p-3 text-sm">{view.note}</p>
				{:else}
					<DataTable
						caption="Totals, as the CLI states them"
						rows={view.totals}
						rowKey={(total) => total.currency}
						columns={totalColumns}
					/>
				{/if}
				<Provenance name="Profit and loss" commands={[pnl.argv]} />
			</div>
		{/snippet}
	</ReadView>
</ReportSection>
