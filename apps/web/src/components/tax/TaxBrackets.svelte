<script lang="ts">
import type { BracketBar } from "../../lib/view/tax"
import Money from "../ui/Money.svelte"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	bars: readonly BracketBar[]
	notes: readonly string[]
	toNextBracket: string | null
	currency: string
}

let { bars, notes, toNextBracket, currency }: Props = $props()
</script>

<!-- One bar per bracket the income reached, filled by its income; the last is the top rate. -->
<section aria-labelledby="tax-brackets-title" class="space-y-3">
	<h3 id="tax-brackets-title" class="text-base font-semibold">Your brackets</h3>
	{#each notes as note, index (index)}
		<p role="note" class="rounded-md bg-muted p-3 text-sm">{note}</p>
	{/each}
	<ul class="space-y-3 rounded-lg border border-border p-4 text-sm">
		{#each bars as bar (bar.key)}
			<li>
				<div class="flex flex-wrap items-baseline justify-between gap-x-4">
					<span class="font-medium">
						{bar.rate}
						{#if bar.top}<span class="text-accent">Your top rate</span>{/if}
					</span>
					<span class="text-muted-foreground">
						<Money amount={bar.income} /> taxed, <Money amount={bar.tax} {currency} /> tax
					</span>
				</div>
				<div class="mt-1 h-2 rounded bg-muted" aria-hidden="true">
					<div class="h-2 rounded bg-accent" style:width="{bar.width}%"></div>
				</div>
			</li>
		{/each}
	</ul>
	{#if toNextBracket !== null}
		<p class="text-sm">
			<Money amount={toNextBracket} {currency} /> more taxable income before the next rate.
		</p>
	{/if}
	<p class="text-sm">
		<SiteLink href="/optimize/allowances/" class="text-accent underline-offset-4 hover:underline"
			>Lower it with allowances</SiteLink
		>
	</p>
</section>
