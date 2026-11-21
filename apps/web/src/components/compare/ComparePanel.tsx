import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import {
	chartSides,
	compareSides,
	comparisonChart,
	figureRows,
	type Terms,
} from "../../lib/view/compare"
import { EmptyState } from "../ui/EmptyState"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { CompareChart } from "./CompareChart"
import { CompareFigures } from "./CompareFigures"
import { CompareNotes } from "./CompareNotes"
import { CompareSides } from "./CompareSides"

export interface ComparePanelProps {
	/** The compare Read, or null when the Snapshot has no comparison. */
	readonly compare: Read<ProjectionCompare> | null
	/** The Projections by Scenario name, which the chart reads for A and B. */
	readonly projections: Readonly<Record<string, Read<ProjectionRun>>>
	readonly terms: Terms
	readonly onTerms: (terms: Terms) => void
}

/** The Compare page's body: the sides, the chart, the figures, and the notes, or the empty state. */
export function ComparePanel({ compare, projections, terms, onTerms }: ComparePanelProps) {
	const read = compare
	if (read === null) return <NoComparison />
	return (
		<ReadView
			read={read}
			label="The comparison"
			render={(data) => {
				const sides = compareSides(data)
				const chart = comparisonChart(chartSides(projections, data), terms)
				return (
					<div className="space-y-8">
						<CompareSides sides={sides} />
						<CompareChart state={chart} terms={terms} onTerms={onTerms} />
						<CompareFigures
							rows={figureRows(data)}
							currency={data.currency}
							headers={[`A, ${sides[0].name}`, `B, ${sides[1].name}`]}
						/>
						<CompareNotes data={data} />
						<Provenance argv={read.argv} />
					</div>
				)
			}}
		/>
	)
}

/** The command that writes a Snapshot with a comparison of two Scenarios, run in apps/web. */
const COMPARE_COMMAND = "bun run dashboard -- --as-of YYYY-MM-DD --horizon YYYY-MM-DD --compare A B"

/** The state of a page with no comparison: a comparison needs two Scenarios and the flag that asks for them. */
function NoComparison() {
	return (
		<EmptyState title="No comparison yet">
			<p>
				A comparison needs two Scenarios. Ask for one with the flag{" "}
				<code className="font-mono">--compare A B</code> on the Dashboard command:
			</p>
			<pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
				<code>{COMPARE_COMMAND}</code>
			</pre>
		</EmptyState>
	)
}
