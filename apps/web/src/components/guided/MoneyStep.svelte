<script lang="ts">
import type { MoneyView } from "../../lib/view/guided/money"
import { amountProblem, type RowDraft, type RowDrafts } from "../../lib/view/guided/money-draft"
import Money from "../ui/Money.svelte"
import MoneyKeepAlert from "./MoneyKeepAlert.svelte"
import MoneyRow from "./MoneyRow.svelte"
import { HINT } from "./styles"

interface Props {
	money: MoneyView
	rows: RowDrafts
	/** Whether Next found a problem, so every field shows its own. */
	showProblems: boolean
	/** The step's heading, which the page focuses when the step changes. */
	heading?: HTMLHeadingElement | undefined
	onRow: (id: string, change: Partial<RowDraft>) => void
}

let { money, rows, showProblems, heading = $bindable(), onRow }: Props = $props()
/** True once a row is dropped or answered differently, so the totals say what they are before the change. */
const changed = $derived(
	money.rows.some((row) => {
		const draft = rows[row.id]
		if (draft === undefined) return false
		return !draft.keep || draft.amount !== "" || (row.type === "income" && !draft.earned)
	}),
)
/** The two groups, income first, each in the order the CLI stated its rows. */
const groups = $derived([
	{
		type: "income" as const,
		title: "Income",
		rows: money.rows.filter((row) => row.type === "income"),
	},
	{
		type: "expense" as const,
		title: "Spending",
		rows: money.rows.filter((row) => row.type === "expense"),
	},
])
</script>

<section class="space-y-4">
	<h2 bind:this={heading} tabindex="-1" class="text-base font-semibold">Your money</h2>
	{#if money.monthsCovered !== null}
		<p class={HINT}>From {money.monthsCovered} whole months of your ledger.</p>
	{/if}
	{#each groups as group (group.type)}
		{#if group.rows.length > 0}
			<section class="space-y-2">
				<h3 class="text-sm font-semibold text-foreground">{group.title}</h3>
				{#if group.type === "income"}
					<p class={HINT}>Untick income that continues after you stop, such as dividends or rent.</p>
				{/if}
				<ul class="divide-y divide-border">
					{#each group.rows as row (row.id)}
						{@const draft = rows[row.id] ?? { keep: true, amount: "", earned: true }}
						<MoneyRow {row} {draft} {showProblems} problem={amountProblem(draft.amount)}
							onKeep={(keep) => onRow(row.id, { keep })}
							onAmount={(amount) => onRow(row.id, { amount })}
							onEarned={(earned) => onRow(row.id, { earned })} />
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
	<MoneyKeepAlert {rows} {showProblems} />
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
