<script lang="ts">
import type { PlanCard } from "../../lib/view/plans/card"
import Money from "../ui/Money.svelte"

interface Props {
	card: PlanCard
}

let { card }: Props = $props()
</script>

<!-- What the plan's reads say: the FI date and the ages on it, the chance of success, and net worth at the end. -->
<dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
	{#if card.fi}
		<div>
			<dt class="text-muted-foreground">FI date</dt>
			<dd class="font-medium">
				{#if card.fi.reachable}
					{card.fi.month}{#if card.fi.ages}, {card.fi.ages}{/if}
				{:else}
					Not reached
				{/if}
			</dd>
		</div>
	{/if}
	{#if card.chance}
		<div>
			<dt class="text-muted-foreground">Chance of success</dt>
			<dd class="font-medium">{card.chance.share}</dd>
		</div>
	{/if}
	{#if card.netWorth}
		<div class="col-span-2">
			<dt class="text-muted-foreground">Net worth at {card.netWorth.endDate}</dt>
			<dd class="text-lg font-semibold">
				<Money amount={card.netWorth.amount} currency={card.netWorth.currency} />
			</dd>
		</div>
	{/if}
</dl>
