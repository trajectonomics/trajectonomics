import type { ProjectionRun, Read } from "../../lib/contract"
import { resolveScenario } from "../../lib/view/tax"
import { EmptyState } from "../ui/EmptyState"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { SegmentedControl } from "../ui/SegmentedControl"
import { TaxBodyView } from "./TaxBodyView"

export interface TaxPanelProps {
	/** The Projections by Scenario name; their names are the choices of the picker. */
	readonly projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for; empty or unknown falls back to the first one. */
	readonly requested: string
	readonly onScenario: (name: string) => void
}

/** The Tax page's body: a Scenario picker, then the chosen Scenario's tax years or its empty state. */
export function TaxPanel({ projections, requested, onScenario }: TaxPanelProps) {
	const names = Object.keys(projections)
	const resolved = resolveScenario(names, requested)
	if (resolved.name === null) return <EmptyState title="No Scenario to read" />
	const name = resolved.name
	const read = projections[name]
	return (
		<div className="space-y-8">
			<SegmentedControl
				name="scenario"
				label="Scenario"
				options={names.map((value) => ({ value, label: value }))}
				value={name}
				onChange={onScenario}
			/>
			{resolved.unknown !== null && (
				<p role="status" className="text-sm text-muted-foreground">
					There is no Scenario named {resolved.unknown}. Showing {name}.
				</p>
			)}
			{read === undefined ? (
				<EmptyState title="No Projection to read" />
			) : (
				<TaxScenario name={name} read={read} />
			)}
		</div>
	)
}

interface TaxScenarioProps {
	readonly name: string
	readonly read: Read<ProjectionRun>
}

function TaxScenario({ name, read }: TaxScenarioProps) {
	return (
		<div className="space-y-8">
			<ReadView
				read={read}
				label={`The tax of ${name}`}
				render={(run) => <TaxBodyView name={name} run={run} />}
			/>
			<Provenance argv={read.argv} />
		</div>
	)
}
