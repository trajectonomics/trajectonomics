<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import type { CardFigure } from "../../lib/view/overview/card-details"
import CompositionBars from "../net-worth/CompositionBars.svelte"
import LiabilityList from "../net-worth/LiabilityList.svelte"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"
import CardDetails from "./CardDetails.svelte"

interface Props {
	netWorth: Read<NetWorthView>
}

let { netWorth }: Props = $props()
/** Every account's exact ledger figure, the loans too, and the CLI's note, in Details. */
const figures = $derived<CardFigure[]>(
	netWorth.ok
		? netWorth.data.rows.map((row) => ({
				label: row.account.name,
				value: row.amount,
				money: true,
				currency: row.currency,
				key: `${row.account.id}:${row.currency}`,
			}))
		: [],
)
const notes = $derived(netWorth.ok && netWorth.data.note !== null ? [netWorth.data.note] : [])
</script>

<!-- Accounts: the assets as a share bar and legend rows, and the loans under it, every amount compact. -->
<Card
	quiet
	level={3}
	className="col-span-2"
	title="Accounts"
	href={netWorth.ok ? "/assets-and-debts/" : undefined}
	argv={netWorth.argv}
>
	{#snippet details()}
		<CardDetails {figures} {notes} />
	{/snippet}
	<ReadView read={netWorth} label="Net worth">
		{#snippet children(view)}
			<div class="grid gap-5 md:grid-cols-2">
				<CompositionBars bars={view.bars} compact />
				<LiabilityList rows={view.liabilities} compact />
			</div>
		{/snippet}
	</ReadView>
</Card>