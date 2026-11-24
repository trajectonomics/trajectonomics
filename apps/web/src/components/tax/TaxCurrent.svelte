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
	{#if year.walk}<TaxWalk lines={year.walk} {currency} />{/if}
	<TaxRates topRate={year.topRate} shareOfIncome={year.shareOfIncome} />
	{#if year.bars}
		<TaxBrackets bars={year.bars} notes={year.notes} toNextBracket={year.toNextBracket} {currency} />
	{:else if year.notes.length > 0}
		<ul class="list-disc space-y-1 pl-5 text-sm">
			{#each year.notes as note, index (index)}<li>{note}</li>{/each}
		</ul>
	{/if}
</section>
