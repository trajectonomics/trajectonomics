<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import type { Balance, Read } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import {
	type TrialBalanceLine,
	type TrialBalanceTotal,
	trialBalanceView,
} from "../../lib/view/ledger/trial-balance"
import DataTable from "../ui/DataTable.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import Money from "../ui/Money.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import type { Column } from "../ui/table-types"
import ReportSection from "./ReportSection.svelte"

interface Props {
	balance: Read<Balance>
}

let { balance }: Props = $props()

const lineColumns: Column<TrialBalanceLine>[] = [
	{ key: "account", header: "Account", cell: lineAccountCell },
	{ key: "debit", header: "Debit", numeric: true, cell: lineDebitCell },
	{ key: "credit", header: "Credit", numeric: true, cell: lineCreditCell },
]

const totalColumns: Column<TrialBalanceTotal>[] = [
	{ key: "currency", header: "Currency", cell: totalCurrencyCell },
	{ key: "debit", header: "Debit", numeric: true, cell: totalDebitCell },
	{ key: "credit", header: "Credit", numeric: true, cell: totalCreditCell },
]
</script>

{#snippet lineAccountCell(line: TrialBalanceLine)}{line.account}{/snippet}
{#snippet lineDebitCell(line: TrialBalanceLine)}<Money amount={line.debit} currency={line.currency} />{/snippet}
{#snippet lineCreditCell(line: TrialBalanceLine)}<Money amount={line.credit} currency={line.currency} />{/snippet}
{#snippet totalCurrencyCell(total: TrialBalanceTotal)}{total.currency}{/snippet}
{#snippet totalDebitCell(total: TrialBalanceTotal)}<Money amount={total.debit} />{/snippet}
{#snippet totalCreditCell(total: TrialBalanceTotal)}<Money amount={total.credit} />{/snippet}

<!-- The trial balance at the As-of: every leaf's debit and credit, and the totals per currency. -->
<ReportSection
	id="trial-balance"
	title="Trial balance"
	intro="Each leaf account's balance at the As-of, split into a debit column and a credit column. The totals per currency should agree."
>
	<ReadView read={balance} label="The trial balance">
		{#snippet children(data)}
			{@const view = trialBalanceView(data.trialBalance, currentAccountNames())}
			{#if view === null}
				<EmptyState title="No trial balance in this Snapshot" />
			{:else}
				<div class="space-y-6">
					<DataTable
						caption={`Trial balance at ${formatDate(data.asOf)}`}
						rows={view.lines}
						rowKey={(line) => line.key}
						columns={lineColumns}
					/>
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
					<Provenance argv={balance.argv} />
				</div>
			{/if}
		{/snippet}
	</ReadView>
</ReportSection>
