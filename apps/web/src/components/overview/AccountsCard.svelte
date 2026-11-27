<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import CompositionBars from "../net-worth/CompositionBars.svelte"
import LiabilityList from "../net-worth/LiabilityList.svelte"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	netWorth: Read<NetWorthView>
}

let { netWorth }: Props = $props()
</script>

<!-- Accounts: the assets as a share bar and legend rows, and the loans under it, every amount compact. -->
<Card
	quiet
	className="col-span-2"
	title="Accounts"
	href={netWorth.ok ? "/assets-and-debts/" : undefined}
	argv={netWorth.argv}
>
	<ReadView read={netWorth} label="Net worth">
		{#snippet children(view)}
			<div class="grid gap-5 md:grid-cols-2">
				<CompositionBars bars={view.bars} compact />
				<LiabilityList rows={view.liabilities} compact />
			</div>
		{/snippet}
	</ReadView>
</Card>
