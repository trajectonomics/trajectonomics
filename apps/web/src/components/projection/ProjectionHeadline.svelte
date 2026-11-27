<script lang="ts">
import { formatDate } from "../../lib/format"
import type { Headline } from "../../lib/view/projection/headline"
import Money from "../ui/Money.svelte"
import Stat from "../ui/Stat.svelte"

interface Props {
	headline: Headline
	currency: string
}

/** The three headline figures: closing net worth, the same in today's money, and how long the money lasts. */
let { headline, currency }: Props = $props()
</script>

<div class="grid gap-6 sm:grid-cols-3">
	<Stat
		label="Closing net worth"
		secondary={`Future money, at ${formatDate(headline.closing.date)}`}
	>
		{#snippet value()}<Money amount={headline.closing.amount} {currency} />{/snippet}
	</Stat>
	<Stat label="Net worth in today's money" secondary={`At ${formatDate(headline.real.date)}`}>
		{#snippet value()}<Money amount={headline.real.amount} {currency} />{/snippet}
	</Stat>
	<Stat label="Money lasts">
		{#snippet value()}
			{#if headline.runsOut}
				Runs out <span class="whitespace-nowrap">{formatDate(headline.runsOut.date)}</span>,
				<Money amount={headline.runsOut.unmet} {currency} /> unmet
			{:else}
				To the end of the plan, {headline.horizonYear}
			{/if}
		{/snippet}
	</Stat>
</div>
