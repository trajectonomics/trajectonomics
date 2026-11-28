<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import type { CardFigure } from "../../lib/view/overview/card-details"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"
import Totals from "../ui/Totals.svelte"
import CardDetails from "./CardDetails.svelte"

interface Props {
	netWorth: Read<NetWorthView>
}

let { netWorth }: Props = $props()
/** Each currency's total at the CLI's exact figure, and the CLI's note, both in Details. */
const figures = $derived<CardFigure[]>(
	netWorth.ok
		? netWorth.data.totals.map((total) => ({
				label: `Net worth in ${total.currency}`,
				value: total.amount,
				money: true,
				currency: total.currency,
				key: total.currency,
			}))
		: [],
)
const notes = $derived(netWorth.ok && netWorth.data.note !== null ? [netWorth.data.note] : [])
</script>

<!-- Net worth: the compact total and its As-of, with the exact figures and the CLI's note in Details. -->
<Card quiet level={3} title="Net worth" href={netWorth.ok ? "/net-worth/" : undefined} argv={netWorth.argv}>
	{#snippet details()}
		<CardDetails {figures} {notes} />
	{/snippet}
	<ReadView read={netWorth} label="Net worth">
		{#snippet children(view)}
			<div class="space-y-1">
				<Totals totals={view.totals} className="text-lg font-semibold tracking-tight" compact />
				<p class="text-sm text-muted-foreground">As of {view.asOf}</p>
			</div>
		{/snippet}
	</ReadView>
</Card>