<script lang="ts">
import type { MoneyView } from "../../lib/view/guided/money"
import { amountProblem, type RowDraft, type RowDrafts } from "../../lib/view/guided/money-draft"
import Money from "../ui/Money.svelte"
import MoneyRow from "./MoneyRow.svelte"

interface Props {
	money: MoneyView
	rows: RowDrafts
	onRow: (id: string, change: Partial<RowDraft>) => void
}

let { money, rows, onRow }: Props = $props()
/** True once a row is dropped or answered differently, so the totals say what they are before the change. */
const changed = $derived(
	money.rows.some((row) => {
		const draft = rows[row.id]
		if (draft === undefined) return false
		return !draft.keep || draft.amount !== "" || (row.type === "income" && !draft.earned)
	}),
)
</script>

<section class="space-y-4">
	<h2 class="text-base font-semibold">Your money</h2>
	<ul class="divide-y divide-border">
		{#each money.rows as row (row.id)}
			{@const draft = rows[row.id] ?? { keep: true, amount: "", earned: true }}
			<MoneyRow {row} {draft} problem={amountProblem(draft.amount)}
				onKeep={(keep) => onRow(row.id, { keep })}
				onAmount={(amount) => onRow(row.id, { amount })}
				onEarned={(earned) => onRow(row.id, { earned })} />
		{/each}
	</ul>
	{#if money.leftOut.length > 0}
		<section class="space-y-1">
			<h3 class="text-sm font-semibold text-foreground">Not carried in</h3>
			<ul class="space-y-1 text-sm text-muted-foreground">
				{#each money.leftOut as one (one.name)}
					<li>{one.name}: {one.reason}</li>
				{/each}
			</ul>
		</section>
	{/if}
	<p class="flex flex-wrap items-baseline gap-x-2 text-sm text-foreground">
		<span>From your ledger, per month{#if changed} before your changes{/if}:</span>
		{#if money.totals.income !== null}
			<span>Income <Money amount={money.totals.income} /></span>
		{/if}
		{#if money.totals.spending !== null}
			<span>Spending <Money amount={money.totals.spending} /></span>
		{/if}
	</p>
</section>
