<script lang="ts">
import type { NetWorthPageView } from "../../lib/view/net-worth/page"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import AccountsTable from "./AccountsTable.svelte"
import CompositionBars from "./CompositionBars.svelte"
import LiabilityList from "./LiabilityList.svelte"
import MonthEndTable from "./MonthEndTable.svelte"

interface Props {
	view: NetWorthPageView
}

let { view }: Props = $props()
</script>

<!-- Below the focus point: the CLI's note, the composition, every row and the month-end table. The headline
     and the history chart are the focus point above, so they are not drawn twice. -->
<ReadView read={view.netWorth} label="Net worth">
	{#snippet children(data)}
		<div class="space-y-10">
			<p class="text-sm text-muted-foreground">{view.history.line}</p>
			{#if view.history.cut}
				<p class="text-sm text-muted-foreground">{view.history.cut}</p>
			{/if}
			{#if data.note}
				<p class="rounded-md border border-border p-3 text-sm">{data.note}</p>
			{/if}
			<Provenance name="Net worth" commands={[view.netWorth.argv]} />
			<section aria-labelledby="composition-title" class="space-y-5">
				<h2 id="composition-title" class="text-base font-semibold">Assets and liabilities</h2>
				<CompositionBars bars={data.bars} />
				<LiabilityList rows={data.liabilities} />
			</section>
			<section aria-labelledby="accounts-title" class="space-y-3">
				<h2 id="accounts-title" class="text-base font-semibold">Every account</h2>
				<AccountsTable rows={data.rows} />
			</section>
			<MonthEndTable rows={view.history.rows} />
		</div>
	{/snippet}
</ReadView>
