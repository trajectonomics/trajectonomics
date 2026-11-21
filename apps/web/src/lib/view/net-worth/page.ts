import type { LineSeries } from "../../chart/line"
import type { Read, Snapshot } from "../../contract"
import { mapRead } from "../overview/map-read"
import { netWorthHistorySeries } from "../overview/net-worth-history"
import { historyLine, type MonthEndRow, monthEndRows } from "./history"
import { type NetWorthView, netWorthView } from "./view"

/** The month-end history as the page shows it: the chart's series, its table and its one line. */
export interface HistoryView {
	readonly series: LineSeries
	readonly rows: readonly MonthEndRow[]
	readonly line: string
}

/** The Net worth page's view of a Snapshot: the headline and composition, and the history. */
export interface NetWorthPageView {
	readonly netWorth: Read<NetWorthView>
	readonly history: HistoryView
}

/** The Net worth page's view of one Snapshot. */
export function netWorthPageView(snapshot: Snapshot): NetWorthPageView {
	const reads = snapshot.reads.netWorthHistory
	return {
		netWorth: mapRead(snapshot.reads.netWorth, netWorthView),
		history: {
			series: netWorthHistorySeries(reads),
			rows: monthEndRows(reads),
			line: historyLine(reads),
		},
	}
}
