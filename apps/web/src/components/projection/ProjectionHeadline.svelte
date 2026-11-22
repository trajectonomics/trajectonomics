<script lang="ts">
import { formatDate } from "../../lib/format"
import type { Headline } from "../../lib/view/projection/headline"
import Money from "../ui/Money.svelte"
import Stat from "../ui/Stat.svelte"

interface Props {
	headline: Headline
	currency: string
}

/** The three headline figures: closing net worth, the same in As-of terms, and the run-out. */
let { headline, currency }: Props = $props()
</script>

<div class="grid gap-6 sm:grid-cols-3">
	<Stat
		label="Closing net worth"
		secondary={`Nominal, at ${formatDate(headline.closing.date)}`}
	>
		{#snippet value()}<Money amount={headline.closing.amount} {currency} />{/snippet}
	</Stat>
	<Stat label="Real net worth, in As-of terms" secondary={`At ${formatDate(headline.real.date)}`}>
		{#snippet value()}<Money amount={headline.real.amount} {currency} />{/snippet}
	</Stat>
	<Stat label="Funding">
		{#snippet value()}
			{#if headline.runsOut}
				Runs out <span class="whitespace-nowrap">{formatDate(headline.runsOut.date)}</span>,
				<Money amount={headline.runsOut.unmet} {currency} /> unmet
			{:else}
				Does not run out before
				<span class="whitespace-nowrap">{formatDate(headline.horizon)}</span>
			{/if}
		{/snippet}
	</Stat>
</div>
