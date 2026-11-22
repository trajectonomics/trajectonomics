<script lang="ts">
import type { OverviewView } from "../../lib/view/overview/view"
import AssetsCard from "./AssetsCard.svelte"
import FiCard from "./FiCard.svelte"
import HealthCard from "./HealthCard.svelte"
import NetWorthCard from "./NetWorthCard.svelte"
import PnlCard from "./PnlCard.svelte"
import ProjectionCard from "./ProjectionCard.svelte"
import TaxCard from "./TaxCard.svelte"

interface Props {
	view: OverviewView
}

let { view }: Props = $props()
</script>

<!-- The Overview's cards: one column on a phone, two on a tablet and three on a wide screen. -->
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
	<NetWorthCard netWorth={view.netWorth} />
	<AssetsCard assets={view.assets} />
	<FiCard scenario={view.fi} />
	<ProjectionCard scenario={view.projection} />
	<TaxCard scenario={view.tax} />
	<PnlCard pnl={view.pnl} />
	<HealthCard health={view.health} />
</div>
