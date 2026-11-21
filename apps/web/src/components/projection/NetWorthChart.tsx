import { useQueryParam } from "../../client/query-param"
import type { ProjectionRun } from "../../lib/contract"
import { netWorthSeries } from "../../lib/view/projection/chart"
import { parseTerms, type Terms } from "../../lib/view/projection/terms"
import { LineChart } from "../chart/LineChart"
import { SegmentedControl, type SegmentedOption } from "../ui/SegmentedControl"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Nominal" },
	{ value: "real", label: "Real, in As-of terms" },
]

export interface NetWorthChartProps {
	readonly run: ProjectionRun
}

/** The net worth chart by year, with the choice of terms in the address bar. */
export function NetWorthChart({ run }: NetWorthChartProps) {
	const [rawTerms, setTerms] = useQueryParam("terms", "both")
	const terms = parseTerms(rawTerms)
	return (
		<section aria-labelledby="net-worth-chart" className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="net-worth-chart" className="text-base font-semibold">
					Net worth by year
				</h2>
				<SegmentedControl
					name="terms"
					label="Terms"
					options={TERM_OPTIONS}
					value={terms}
					onChange={setTerms}
				/>
			</div>
			<LineChart label="Net worth at the close of each year" series={netWorthSeries(run, terms)} />
		</section>
	)
}
