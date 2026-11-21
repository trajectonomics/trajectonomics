import type { LineSeries } from "../../lib/chart/line"
import { LineChart } from "../chart/LineChart"

export interface TaxChartProps {
	readonly series: readonly LineSeries[]
}

/** Due and owed by tax year. Owed is dashed, so the two lines tell apart without colour. */
export function TaxChart({ series }: TaxChartProps) {
	return (
		<section aria-labelledby="tax-chart-title" className="space-y-3">
			<h2 id="tax-chart-title" className="text-base font-semibold">
				Due and owed by tax year
			</h2>
			<LineChart label="Due and owed by tax year" series={series} />
		</section>
	)
}
