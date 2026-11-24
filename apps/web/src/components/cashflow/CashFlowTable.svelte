<script lang="ts">
import type { CashflowLine, Section } from "../../lib/view/cashflow/cashflow"
import { lineKey, lineLabel } from "../../lib/view/cashflow/cashflow-labels"
import { cx } from "../ui/cx"
import Money from "../ui/Money.svelte"

interface Props {
	/** The sections of the year, in the order a person reads them: each total, then its parts' lines. */
	sections: readonly Section[]
	/** The Accounts' names by id, for a line's label. */
	accountNames: ReadonlyMap<string, string>
	/** The key of the band the person picked, whose row is shown picked. */
	picked: string | null
	onPick: (key: string) => void
}

/** The year's lines under the CLI's section totals. The page adds nothing: each total is the CLI's string. */
let { sections, accountNames, picked, onPick }: Props = $props()

function label(line: CashflowLine): string {
	return lineLabel(line, accountNames)
}

const isEmpty = (section: Section): boolean =>
	section.parts.every((part) => part.lines.length === 0)
</script>

<div class="max-w-full overflow-x-auto rounded-lg border border-border">
	<table class="w-full min-w-max border-collapse text-sm">
		<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
			Each line of the year, with the total of its section
		</caption>
		<thead class="bg-card">
			<tr>
				<th scope="col" class="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground">Line</th>
				<th scope="col" class="border-b border-border px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
			</tr>
		</thead>
		{#each sections as section (section.total)}
			<tbody class="border-b border-border">
				<tr class="bg-muted/40">
					<th scope="rowgroup" class="px-3 py-2 text-left font-semibold">{section.total}</th>
					<td class="px-3 py-2 text-right tabular-nums font-semibold">
						{#if section.amount === null}
							<span class="font-normal text-muted-foreground">{section.note === null ? "No total" : "Not in cash"}</span>
						{:else}
							<Money amount={section.amount} />
						{/if}
					</td>
				</tr>
				{#if section.note !== null}
					<tr>
						<td colspan="2" class="px-3 pt-2 text-xs text-muted-foreground">{section.note}</td>
					</tr>
				{/if}
				{#each section.parts as part (part.heading)}
					{#if part.heading !== null}
						<tr>
							<th scope="rowgroup" colspan="2" class="px-3 pt-2 text-left text-xs font-medium text-muted-foreground">{part.heading}</th>
						</tr>
					{/if}
					{#each part.lines as line (lineKey(line))}
						{@const key = lineKey(line)}
						<tr class={cx("border-t border-border", picked === key && "bg-secondary")}>
							<td class="px-3 py-2 align-top">
								<button
									type="button"
									aria-pressed={picked === key}
									onclick={() => onPick(key)}
									class="text-left outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
								>
									{label(line)}
								</button>
							</td>
							<td class="px-3 py-2 text-right align-top tabular-nums">
								<Money amount={line.amount} />
							</td>
						</tr>
					{/each}
				{/each}
				{#if isEmpty(section)}
					<tr class="border-t border-border">
						<td colspan="2" class="px-3 py-2 text-muted-foreground">No lines</td>
					</tr>
				{/if}
			</tbody>
		{/each}
	</table>
</div>
