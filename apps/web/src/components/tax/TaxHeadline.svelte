<script lang="ts">
import type { TaxHeadline as Headline } from "../../lib/view/tax"
import Money from "../ui/Money.svelte"
import Stat from "../ui/Stat.svelte"

interface Props {
	headline: Headline
	currency: string
}

let { headline, currency }: Props = $props()
</script>

<!-- The first tax year: what is owed, or a refund in words, with its Levy, period and settlement date. -->
<Stat
	label={headline.refund ? "Refund" : "Owed"}
	secondary={`${headline.levy}, ${headline.period}, settles ${headline.settles}`}
>
	{#snippet value()}
		<Money amount={headline.owed} {currency} />
	{/snippet}
</Stat>
