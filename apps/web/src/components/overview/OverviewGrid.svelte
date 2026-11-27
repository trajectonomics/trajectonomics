<script lang="ts">
import type { OverviewView } from "../../lib/view/overview/view"
import AccountsCard from "./AccountsCard.svelte"
import AllowancesCard from "./AllowancesCard.svelte"
import ChanceCard from "./ChanceCard.svelte"
import EstateCard from "./EstateCard.svelte"
import NetWorthCard from "./NetWorthCard.svelte"
import ProjectionCard from "./ProjectionCard.svelte"
import TaxCard from "./TaxCard.svelte"
import WithdrawalsCard from "./WithdrawalsCard.svelte"

interface Props {
	view: OverviewView
}

/** The quiet cards under the focus point: two columns on a phone, four on a wide screen, two of them wide. */
let { view }: Props = $props()
</script>

<section aria-labelledby="overview-summary" class="space-y-4">
	<h2 id="overview-summary" class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your summary</h2>
	<div data-summary-grid class="grid grid-cols-2 gap-4 xl:grid-cols-4">
		<NetWorthCard netWorth={view.netWorth} />
		<ProjectionCard scenario={view.projection} />
		<ChanceCard scenario={view.chance} />
		<TaxCard scenario={view.tax} />
		<AccountsCard netWorth={view.netWorth} />
		<AllowancesCard scenario={view.allowances} />
		<WithdrawalsCard scenario={view.withdrawals} />
		<EstateCard scenario={view.estate} />
	</div>
</section>
