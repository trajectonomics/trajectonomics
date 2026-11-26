<script lang="ts">
import type { CurrentYear } from "../../lib/view/tax"
import TaxBrackets from "./TaxBrackets.svelte"
import TaxRates from "./TaxRates.svelte"
import TaxWalk from "./TaxWalk.svelte"

interface Props {
	year: CurrentYear
	currency: string
}

let { year, currency }: Props = $props()
</script>

<!-- The current tax year in full: its walk, its brackets and its two rates. -->
<section aria-labelledby="tax-current-title" class="space-y-6">
	<div>
		<h2 id="tax-current-title" class="text-base font-semibold">This tax year</h2>
		<p class="text-sm text-muted-foreground">{year.levy}, {year.period}</p>
	</div>
	{#each year.notes as note, index (index)}
		<p role="note" class="rounded-md bg-muted p-3 text-sm" data-cli>{note}</p>
	{/each}
	{#if year.walk}<TaxWalk lines={year.walk} {currency} />{/if}
	<TaxRates topRate={year.topRate} shareOfIncome={year.shareOfIncome} />
	{#if year.bars}
		<TaxBrackets bars={year.bars} toNextBracket={year.toNextBracket} {currency} />
	{/if}
</section>
