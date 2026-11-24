<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthCardView } from "../../lib/view/overview/view"
import Sparkline from "../chart/Sparkline.svelte"
import Card from "../ui/Card.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"
import Totals from "../ui/Totals.svelte"

interface Props {
	netWorth: Read<NetWorthCardView>
}

let { netWorth }: Props = $props()
</script>

<!-- Net worth: the total as the largest figure, its As-of, a sparkline of the month-ends and any note. -->
<Card title="Net worth" href="/net-worth/" argv={netWorth.argv}>
	<ReadView read={netWorth} label="Net worth">
		{#snippet children(view)}
			<div class="space-y-4">
				<div>
					<Totals totals={view.totals} className="text-3xl font-semibold tracking-tight" />
					<p class="mt-1 text-sm text-muted-foreground">As of {view.asOf}</p>
				</div>
				{#if view.fees}
					<p class="text-sm">Fees over the plan: <Money amount={view.fees.amount} currency={view.fees.currency} /></p>
				{/if}
				{#if view.note}
					<p class="text-sm">{view.note}</p>
				{/if}
				{#if view.sparkline.length > 1}
					<div>
						<Sparkline label="Net worth at each month-end" values={view.sparkline} />
						<p class="mt-1 text-xs text-muted-foreground">Month-end history</p>
					</div>
				{/if}
			</div>
		{/snippet}
	</ReadView>
</Card>
