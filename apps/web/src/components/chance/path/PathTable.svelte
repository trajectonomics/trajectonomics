<script lang="ts">
import type { PathRow } from "../../../lib/view/chance/path-rows"
import type { Terms } from "../../../lib/view/projection/terms"
import Badge from "../../ui/Badge.svelte"
import Money from "../../ui/Money.svelte"

interface Props {
	rows: readonly PathRow[]
	/** The name of each Account that has a return column, in column order. */
	accounts: readonly string[]
	/** Whether the CLI stated each roll-up's inflation, so the table shows its Inflation column (cli ADR-0085). */
	inflation: boolean
	terms: Terms
	currency: string
}

/** One row per year: the age, the inflation drawn, each Account's return, income, spending and net worth. */
let { rows, accounts, inflation, terms, currency }: Props = $props()
const head = "border-b border-border px-3 py-2 font-medium text-muted-foreground"
</script>

<div class="max-h-[70vh] max-w-full overflow-auto rounded-lg border border-border">
	<table class="w-full min-w-max border-collapse text-sm">
		<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Each year of this future, in {currency}</caption>
		<thead class="sticky top-0 z-10 bg-card">
			<tr>
				<th scope="col" class={`${head} text-left`}>Year ending</th>
				<th scope="col" class={`${head} text-left`}>Age</th>
				{#if inflation}<th scope="col" class={`${head} text-right`}>Inflation</th>{/if}
				{#each accounts as name (name)}
					<th scope="col" class={`${head} text-right`}>{name} return</th>
				{/each}
				<th scope="col" class={`${head} text-right`}>Income</th>
				<th scope="col" class={`${head} text-right`}>Spending</th>
				{#if terms !== "real"}<th scope="col" class={`${head} text-right`}>Net worth</th>{/if}
				{#if terms !== "nominal"}<th scope="col" class={`${head} text-right`}>Net worth in today's money</th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr class="border-b border-border last:border-0">
					<td class="px-3 py-2 align-top">
						{row.ends}
						{#each row.marks as mark (mark)}
							<span class="mt-1 block"><Badge tone={mark === "Ran out" ? "accent" : "neutral"}>{mark}</Badge></span>
						{/each}
					</td>
					<td class="px-3 py-2 align-top">{row.ages || "—"}</td>
					{#if inflation}<td class="px-3 py-2 text-right align-top tabular-nums">{row.inflation ?? "—"}</td>{/if}
					{#each row.returns as text, index (index)}
						<td class="px-3 py-2 text-right align-top tabular-nums">{text ?? "—"}</td>
					{/each}
					<td class="px-3 py-2 text-right align-top"><Money amount={row.income} /></td>
					<td class="px-3 py-2 text-right align-top"><Money amount={row.spending} /></td>
					{#if terms !== "real"}<td class="px-3 py-2 text-right align-top"><Money amount={row.netWorth} signed /></td>{/if}
					{#if terms !== "nominal"}<td class="px-3 py-2 text-right align-top"><Money amount={row.realNetWorth} signed /></td>{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
