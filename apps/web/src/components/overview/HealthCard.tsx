import type { Read } from "../../lib/contract"
import type { HealthView } from "../../lib/view/overview/health"
import { Badge } from "../ui/Badge"
import { Card } from "../ui/Card"
import { ReadView } from "../ui/ReadView"

export interface HealthCardProps {
	readonly health: Read<HealthView>
}

/** The ledger's health: the CLI's verdict, how many checks failed, and the row counts. */
export function HealthCard({ health }: HealthCardProps) {
	return (
		<Card title="Ledger health" href="/health/" argv={health.argv}>
			<ReadView
				read={health}
				label="Ledger health"
				render={(view) => (
					<div className="space-y-4">
						<div className="space-y-1">
							<Badge tone={view.ok ? "neutral" : "accent"}>
								{view.ok ? "OK" : "Needs attention"}
							</Badge>
							<p className="text-sm">
								{view.failed === 0
									? `All ${view.checks} checks pass.`
									: `${view.failed} of ${view.checks} checks failed.`}
							</p>
						</div>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							{view.counts.map((count) => (
								<div key={count.label} className="flex justify-between gap-2">
									<dt className="text-muted-foreground">{count.label}</dt>
									<dd className="tabular-nums">{count.value}</dd>
								</div>
							))}
						</dl>
					</div>
				)}
			/>
		</Card>
	)
}
