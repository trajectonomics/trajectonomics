<script lang="ts">
import { formatDate } from "../../lib/format"
import { type EstateFigures, shownUnder } from "../../lib/view/estate/figures"
import type { Terms } from "../../lib/view/projection/terms"
import { cx } from "../ui/cx"
import Money from "../ui/Money.svelte"

interface Props {
	figures: EstateFigures
	terms: Terms
	/** The key of the diagram band the person picked, whose row shows picked. */
	picked: string | null
	onPick: (key: string) => void
}

/** Every line of the date, each cost and gift under its total. A line the person picks is picked in the diagram too. */
let { figures, terms, picked, onPick }: Props = $props()
</script>

<div class="relative max-w-full overflow-x-auto rounded-lg border border-border">
	<table class="w-full min-w-max border-collapse text-sm">
		<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">The estate on {formatDate(figures.date)}, line by line</caption>
		<thead class="bg-card">
			<tr>
				<th scope="col" class="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground">Line</th>
				<th scope="col" class="border-b border-border px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
			</tr>
		</thead>
		<tbody>
			{#each figures.items as item (item.key)}
				{@const shown = shownUnder(item, terms)}
				<tr class={cx("border-t border-border", picked === item.key && "bg-secondary", !item.part && "font-medium")}>
					<td class={cx("px-3 py-2 align-top", item.part && "pl-8 text-muted-foreground")}>
						<button type="button" aria-pressed={picked === item.key} onclick={() => onPick(item.key)} class="text-left outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">{item.label}</button>
						{#if item.part}<span class="sr-only">, a part of the total above</span>{/if}
					</td>
					<td class="px-3 py-2 text-right align-top tabular-nums">
						<Money amount={shown.amount} signed />
						{#if shown.tag}<span class="block text-xs font-normal text-muted-foreground">{shown.tag}</span>{/if}
						{#if shown.aside !== null}<span class="block text-xs font-normal text-muted-foreground">in today's money <Money amount={shown.aside} /></span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
