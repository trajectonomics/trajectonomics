<script lang="ts">
import type { Read } from "../../lib/contract"
import { accountTypeLabel } from "../../lib/view/net-worth/account-type"
import type { PnlView } from "../../lib/view/overview/pnl"
import AccountName from "../ui/AccountName.svelte"
import Card from "../ui/Card.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"
import Totals from "../ui/Totals.svelte"

interface Props {
	pnl: Read<PnlView>
}

let { pnl }: Props = $props()
</script>

<!-- Profit and loss for the period: the CLI's totals and its three largest rows. -->
<Card title="Profit and loss, year to date" href="/ledger/" argv={pnl.argv}>
	<ReadView read={pnl} label="Profit and loss">
		{#snippet children(view)}
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">{view.period}</p>
				<div>
					<p class="text-sm text-muted-foreground">Income less expenses</p>
					<Totals totals={view.totals} className="mt-1 text-2xl font-semibold tracking-tight" />
					{#if view.note}
						<p class="mt-2 text-sm">{view.note}</p>
					{/if}
				</div>
				{#if view.hasRows}
					<div class="space-y-2">
						<p class="text-sm text-muted-foreground">Largest rows</p>
						<ul class="divide-y divide-border text-sm">
							{#each view.largest as row (`${row.account.id}:${row.currency}`)}
								<li class="flex items-center justify-between gap-3 py-2">
									<span class="min-w-0 truncate">
										<AccountName id={row.account.id} name={row.account.name} />
										<span class="ml-2 text-xs text-muted-foreground">
											{accountTypeLabel(row.type)}
										</span>
									</span>
									<span class="shrink-0">
										<Money amount={row.amount} currency={row.currency} />
									</span>
								</li>
							{/each}
						</ul>
						<p class="text-xs text-muted-foreground">
							Income is shown negative and expenses positive, as the ledger books them.
						</p>
					</div>
				{:else}
					<p class="text-sm">No income or expense in this period.</p>
				{/if}
			</div>
		{/snippet}
	</ReadView>
</Card>
