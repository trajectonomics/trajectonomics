import type { HistoryView } from "../../lib/view/net-worth/page"
import { LineChart } from "../chart/LineChart"

export interface HistoryChartProps {
	readonly history: HistoryView
}

/** The month-end net worth line, and one line on how many reads the history used. */
export function HistoryChart({ history }: HistoryChartProps) {
	return (
		<section aria-labelledby="history-title" className="space-y-3">
			<h2 id="history-title" className="text-base font-semibold">
				Month-end history
			</h2>
			<LineChart label="Net worth at each month-end" series={[history.series]} />
			<p className="text-sm text-muted-foreground">{history.line}</p>
		</section>
	)
}
