import type { Read } from "../../lib/contract"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import { CompositionBars } from "../net-worth/CompositionBars"
import { LiabilityList } from "../net-worth/LiabilityList"
import { Card } from "../ui/Card"
import { ReadView } from "../ui/ReadView"

export interface AssetsCardProps {
	readonly assets: Read<NetWorthView>
}

/** Assets and liabilities: the assets as a bar by account, and the liabilities listed under it. */
export function AssetsCard({ assets }: AssetsCardProps) {
	return (
		<Card title="Assets and liabilities" href="/net-worth/" argv={assets.argv}>
			<ReadView
				read={assets}
				label="Net worth"
				render={(view) => (
					<div className="space-y-5">
						<CompositionBars bars={view.bars} />
						<LiabilityList rows={view.liabilities} />
					</div>
				)}
			/>
		</Card>
	)
}
