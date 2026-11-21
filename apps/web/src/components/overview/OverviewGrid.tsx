import type { OverviewView } from "../../lib/view/overview/view"
import { AssetsCard } from "./AssetsCard"
import { FiCard } from "./FiCard"
import { HealthCard } from "./HealthCard"
import { NetWorthCard } from "./NetWorthCard"
import { PnlCard } from "./PnlCard"
import { ProjectionCard } from "./ProjectionCard"
import { TaxCard } from "./TaxCard"

export interface OverviewGridProps {
	readonly view: OverviewView
}

/** The Overview's cards: one column on a phone, two on a tablet and three on a wide screen. */
export function OverviewGrid({ view }: OverviewGridProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<NetWorthCard netWorth={view.netWorth} />
			<AssetsCard assets={view.assets} />
			<FiCard scenario={view.fi} />
			<ProjectionCard scenario={view.projection} />
			<TaxCard scenario={view.tax} />
			<PnlCard pnl={view.pnl} />
			<HealthCard health={view.health} />
		</div>
	)
}
