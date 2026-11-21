import type { ProjectionRun } from "../../lib/contract"
import { annualRowsOf, monthlyRowsOf } from "../../lib/view/projection/annual"
import { headlineOf } from "../../lib/view/projection/headline"
import { EmptyState } from "../ui/EmptyState"
import { AnnualTable } from "./AnnualTable"
import { MonthlyTable } from "./MonthlyTable"
import { NetWorthChart } from "./NetWorthChart"
import { ProjectionHeadline } from "./ProjectionHeadline"
import { ResultStatement } from "./ResultStatement"

export interface ProjectionResultProps {
	readonly run: ProjectionRun
	/** The argv of the Read the projection came from, for its command. */
	readonly argv: readonly string[]
}

/** One projection: its headline, the chart, the annual table, the monthly rows and its statement. */
export function ProjectionResult({ run, argv }: ProjectionResultProps) {
	const headline = headlineOf(run)
	const monthly = monthlyRowsOf(run)
	return (
		<div className="space-y-8">
			{headline ? (
				<ProjectionHeadline headline={headline} currency={run.currency} />
			) : (
				<EmptyState title="No year to show" />
			)}
			<NetWorthChart run={run} />
			<AnnualTable rows={annualRowsOf(run)} currency={run.currency} />
			{monthly && <MonthlyTable rows={monthly} count={monthly.length} />}
			<ResultStatement shape={run} argv={argv} />
		</div>
	)
}
