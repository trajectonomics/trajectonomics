<script lang="ts">
import type { Read } from "../../lib/contract"
import { accountTypeLabel } from "../../lib/view/net-worth/account-type"
import type { PnlView } from "../../lib/view/overview/pnl"
import AccountName from "../ui/AccountName.svelte"
import Card from "../ui/Card.svelte"
import DirectedMoney from "../ui/DirectedMoney.svelte"
import ReadView from "../ui/ReadView.svelte"

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
					{#if view.totals.length === 0}
						<p class="mt-1 text-muted-foreground">No total</p>
					{:else}
						<span class="mt-1 flex flex-col gap-1 text-2xl font-semibold tracking-tight">
							{#each view.totals as total (total.currency)}
								<DirectedMoney
									amount={total.amount}
									currency={total.currency}
									kind="net"
									compact
								/>
							{/each}
						</span>
					{/if}
					{#if view.note}
						<p class="mt-2 text-sm">{view.note}</p>
					{/if}
				</div>
				{#if view.hasRows}
					<div class="space-y-2">
						<p class="text-sm text-muted-foreground">Largest rows</p>
						<ul class="divide-y divide-border text-sm">
							{#each view.largest as row (`${row.account.id}:${row.currency}`)}
								<li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
									<span class="min-w-0 truncate">
										<AccountName id={row.account.id} name={row.account.name} />
										<span class="ml-2 text-xs text-muted-foreground">
											{accountTypeLabel(row.type)}
										</span>
									</span>
									<span class="shrink-0">
										<DirectedMoney
											amount={row.amount}
											currency={row.currency}
											kind="money"
										/>
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="text-sm">No income or expense in this period.</p>
				{/if}
			</div>
		{/snippet}
	</ReadView>
</Card>
