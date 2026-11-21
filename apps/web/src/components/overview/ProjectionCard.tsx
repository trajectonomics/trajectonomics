import type { ProjectionView } from "../../lib/view/overview/projection"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import { Money } from "../ui/Money"
import { ScenarioCard } from "./ScenarioCard"

export interface ProjectionCardProps {
	readonly scenario: ScenarioView<ProjectionView | null>
}

/** The projection's closing net worth, nominal and in today's money, and whether it runs out. */
export function ProjectionCard({ scenario }: ProjectionCardProps) {
	return (
		<ScenarioCard
			title="Projection"
			href="/projection/"
			label="Projection"
			scenario={scenario}
			render={(view) =>
				view === null ? (
					<p className="text-sm">The projection has no annual rows.</p>
				) : (
					<div className="space-y-4">
						<div className="flex flex-wrap gap-x-6 gap-y-3">
							<div>
								<p className="text-sm text-muted-foreground">Net worth at {view.endDate}</p>
								<p className="mt-1 text-2xl font-semibold tracking-tight">
									<Money amount={view.nominal} currency={view.currency} />
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">In today's money</p>
								<p className="mt-1 text-2xl font-semibold tracking-tight">
									<Money amount={view.real} currency={view.currency} />
								</p>
							</div>
						</div>
						{view.runsOut === null ? (
							<p className="text-sm">Does not run out before {view.horizon}.</p>
						) : (
							<p className="text-sm">
								Runs out on {view.runsOut.date}, with{" "}
								<Money amount={view.runsOut.unmet} currency={view.currency} /> unmet.
							</p>
						)}
					</div>
				)
			}
		/>
	)
}
