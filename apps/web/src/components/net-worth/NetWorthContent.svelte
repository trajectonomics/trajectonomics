<script lang="ts">
import type { NetWorthPageView } from "../../lib/view/net-worth/page"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import Stat from "../ui/Stat.svelte"
import Totals from "../ui/Totals.svelte"
import AccountsTable from "./AccountsTable.svelte"
import CompositionBars from "./CompositionBars.svelte"
import HistoryChart from "./HistoryChart.svelte"
import LiabilityList from "./LiabilityList.svelte"
import MonthEndTable from "./MonthEndTable.svelte"

interface Props {
	view: NetWorthPageView
}

let { view }: Props = $props()
</script>

<!-- The Net worth page's body: the headline, the history, the composition, every row and the table. -->
<ReadView read={view.netWorth} label="Net worth">
	{#snippet children(data)}
		<div class="space-y-10">
			<section class="space-y-4">
				<Stat label="Net worth" secondary={`As of ${data.asOf}`}>
					{#snippet value()}
						<Totals totals={data.totals} className="text-3xl font-semibold" />
					{/snippet}
				</Stat>
				{#if data.note}
					<p class="rounded-md border border-border p-3 text-sm">{data.note}</p>
				{/if}
				<Provenance argv={view.netWorth.argv} />
			</section>
			<HistoryChart history={view.history} />
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
