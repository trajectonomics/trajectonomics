import { useQueryParam } from "../../client/query-param"
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import { EmptyState } from "../ui/EmptyState"
import { ReadView } from "../ui/ReadView"
import { SegmentedControl } from "../ui/SegmentedControl"
import { ProjectionResult } from "./ProjectionResult"

export interface ProjectionViewProps {
	/** The projection Reads of the Snapshot, by Scenario name. */
	readonly projections: Readonly<Record<string, Read<ProjectionRun>>>
}

/** The Scenario picker and the projection of the chosen Scenario. The choice lives in the address bar. */
export function ProjectionView({ projections }: ProjectionViewProps) {
	const names = projectionNames(projections)
	const [requested, setScenario] = useQueryParam("scenario", names[0] ?? "")
	const name = chooseScenario(names, requested)
	const read = name === null ? undefined : projections[name]
	if (name === null || read === undefined) {
		return <EmptyState title="No Scenario to project" />
	}
	return (
		<div className="space-y-6">
			<SegmentedControl
				name="scenario"
				label="Scenario"
				options={names.map((value) => ({ value, label: value }))}
				value={name}
				onChange={setScenario}
			/>
			<ReadView
				read={read}
				label={`Projection of ${name}`}
				render={(run) => <ProjectionResult run={run} argv={read.argv} />}
			/>
		</div>
	)
}
