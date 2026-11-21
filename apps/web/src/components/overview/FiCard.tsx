import type { FiView } from "../../lib/view/overview/fi"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import { ScenarioCard } from "./ScenarioCard"

export interface FiCardProps {
	readonly scenario: ScenarioView<FiView>
}

/** The FI date for the primary Scenario: its month when reachable, else the horizon and what binds. */
export function FiCard({ scenario }: FiCardProps) {
	return (
		<ScenarioCard
			title="FI date"
			href="/fi/"
			label="FI"
			scenario={scenario}
			render={(view) =>
				view.reachable ? (
					<p className="text-3xl font-semibold tracking-tight">{view.month}</p>
				) : (
					<div className="space-y-2">
						<p className="text-xl font-semibold tracking-tight">
							Not reachable before {view.horizon}
						</p>
						<p className="text-sm">{view.binding}</p>
					</div>
				)
			}
		/>
	)
}
