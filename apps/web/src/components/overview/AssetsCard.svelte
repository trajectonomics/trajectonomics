<script lang="ts">
import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import CompositionBars from "../net-worth/CompositionBars.svelte"
import LiabilityList from "../net-worth/LiabilityList.svelte"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	assets: Read<NetWorthView>
}

let { assets }: Props = $props()
</script>

<!-- Assets and liabilities: the assets as a bar by account, and the liabilities listed under it. -->
<Card title="Assets and liabilities" href="/net-worth/" argv={assets.argv}>
	<ReadView read={assets} label="Net worth">
		{#snippet children(view)}
			<div class="space-y-5">
				<CompositionBars bars={view.bars} compact />
				<LiabilityList rows={view.liabilities} />
			</div>
		{/snippet}
	</ReadView>
</Card>
