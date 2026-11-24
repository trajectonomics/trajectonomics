<script lang="ts">
import type { ChanceSource } from "../../lib/view/assumptions/chance"

interface Props {
	source: ChanceSource
}

let { source }: Props = $props()
</script>

<!-- Where a chance read's model came from: the CLI's `returnModel` echo says the plan built it, and without one a file did. -->
<div class="space-y-2" data-source={source.kind}>
	<p class="text-sm font-medium text-foreground">{source.heading}</p>
	<p class="text-sm text-muted-foreground">{source.detail}</p>
	{#if source.accounts.length > 0}
		<ul class="space-y-1 text-sm tabular-nums">
			{#each source.accounts as account (account.id)}
				<li>{account.id}: returns {account.rate} a year, swings {account.volatility}</li>
			{/each}
		</ul>
	{/if}
</div>
