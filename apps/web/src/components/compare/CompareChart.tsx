import type { ChartState, Terms } from "../../lib/view/compare"
import { LineChart } from "../chart/LineChart"
import { EmptyState } from "../ui/EmptyState"
import { SegmentedControl } from "../ui/SegmentedControl"

const TERMS_OPTIONS = [
	{ value: "nominal", label: "Nominal" },
	{ value: "real", label: "Real" },
] as const

export interface CompareChartProps {
	readonly state: ChartState
	readonly terms: Terms
	readonly onTerms: (terms: Terms) => void
}

/** Net worth by year for both Projections, with the nominal or real choice, or why it is not drawn. */
export function CompareChart({ state, terms, onTerms }: CompareChartProps) {
	return (
		<section aria-labelledby="compare-chart-title" className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="compare-chart-title" className="text-base font-semibold">
					Net worth by year
				</h2>
				<SegmentedControl
					name="terms"
					label="Money terms"
					options={TERMS_OPTIONS}
					value={terms}
					onChange={onTerms}
				/>
			</div>
			{state.kind === "chart" ? (
				<LineChart label={`Net worth by year, ${terms}`} series={state.series} />
			) : (
				<EmptyState title="The chart is not drawn">
					{state.reasons.map((reason) => (
						<p key={reason}>{reason}</p>
					))}
				</EmptyState>
			)}
		</section>
	)
}
