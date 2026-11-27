<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"
import Totals from "../ui/Totals.svelte"

interface Props {
	netWorth: Read<NetWorthView>
}

let { netWorth }: Props = $props()
</script>

<!-- Net worth: the compact total and its As-of, and the CLI's note when the zero is not a real reading. -->
<Card quiet title="Net worth" href={netWorth.ok ? "/net-worth/" : undefined} argv={netWorth.argv}>
	<ReadView read={netWorth} label="Net worth">
		{#snippet children(view)}
			<div class="space-y-1">
				<Totals totals={view.totals} className="text-lg font-semibold tracking-tight" compact />
				<p class="text-sm text-muted-foreground">As of {view.asOf}</p>
				{#if view.note}
					<p class="text-sm text-muted-foreground">{view.note}</p>
				{/if}
			</div>
		{/snippet}
	</ReadView>
</Card>
