import type { ReactNode } from "react"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import { Card } from "../ui/Card"
import { ReadView } from "../ui/ReadView"

export interface ScenarioCardProps<T> {
	readonly title: string
	/** The page this card summarises. */
	readonly href: string
	/** The name of the Read this card shows, such as "FI". Named in its error. */
	readonly label: string
	readonly scenario: ScenarioView<T>
	readonly render: (data: T) => ReactNode
}

/** A card for one Scenario's Read: it names the Scenario, and says what is missing when there is none. */
export function ScenarioCard<T>({ title, href, label, scenario, render }: ScenarioCardProps<T>) {
	if (scenario.status === "none") {
		return (
			<Card title={title} href={href}>
				<p className="text-sm text-muted-foreground">The Snapshot names no Scenario.</p>
			</Card>
		)
	}
	if (scenario.status === "unread") {
		return (
			<Card title={title} href={href}>
				<p className="text-sm text-muted-foreground">
					The Snapshot holds no {label} read for Scenario {scenario.name}.
				</p>
			</Card>
		)
	}
	return (
		<Card title={title} href={href} argv={scenario.read.argv}>
			<p className="mb-3 text-sm text-muted-foreground">Scenario {scenario.name}</p>
			<ReadView read={scenario.read} label={label} render={render} />
		</Card>
	)
}
