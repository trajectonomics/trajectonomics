import type { ScenarioView } from "../../lib/view/overview/scenario"
import type { TaxView } from "../../lib/view/overview/tax"
import { Badge } from "../ui/Badge"
import { Money } from "../ui/Money"
import { ScenarioCard } from "./ScenarioCard"

export interface TaxCardProps {
	readonly scenario: ScenarioView<TaxView>
}

/** The first settlement period of the primary Scenario: what is owed, when it is due, and the tax status. */
export function TaxCard({ scenario }: TaxCardProps) {
	return (
		<ScenarioCard
			title="Tax"
			href="/tax/"
			label="tax"
			scenario={scenario}
			render={(view) => (
				<div className="space-y-4">
					<Badge>{view.status}</Badge>
					{view.first === null ? (
						<p className="text-sm">This Scenario has no Levy, so every figure is before tax.</p>
					) : (
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">Owed for {view.first.period}</p>
							<p className="text-2xl font-semibold tracking-tight">
								<Money amount={view.first.owed} currency={view.currency} />
							</p>
							<p className="text-sm">Settles {view.first.settlement}</p>
							<p className="text-sm text-muted-foreground">Levy {view.first.levy}</p>
							{view.first.partial && <p className="text-sm">A partial year.</p>}
							{!view.first.settled && <p className="text-sm">Its settlement is not in view.</p>}
						</div>
					)}
				</div>
			)}
		/>
	)
}
