import type { LineSeries } from "../../chart/line"
import type { Read, Snapshot } from "../../contract"
import { accountNames } from "../account-names"
import { mapRead } from "../overview/map-read"
import { netWorthHistorySeries } from "../overview/net-worth-history"
import { historyCut, historyLine, type MonthEndRow, monthEndRows } from "./history"
import { type NetWorthView, netWorthView } from "./view"

/** The month-end history as the page shows it: the chart's series, its table and its one line. */
export interface HistoryView {
	readonly series: LineSeries
	readonly rows: readonly MonthEndRow[]
	readonly line: string
	/** Plain words when the history starts later than the ledger's first entry, else null. */
	readonly cut: string | null
}

/** The Net worth page's view of a Snapshot: the headline and composition, and the history. */
export interface NetWorthPageView {
	readonly netWorth: Read<NetWorthView>
	readonly history: HistoryView
}

/** The Net worth page's view of one Snapshot. */
export function netWorthPageView(snapshot: Snapshot): NetWorthPageView {
	const reads = snapshot.reads.netWorthHistory
	const names = accountNames(snapshot.reads.accounts)
	return {
		netWorth: mapRead(snapshot.reads.netWorth, (data) => netWorthView(data, names)),
		history: {
			series: netWorthHistorySeries(reads),
			rows: monthEndRows(reads),
			line: historyLine(reads),
			cut: historyCut(
				snapshot.params.historyDates,
				snapshot.reads.netWorth.ok ? snapshot.reads.netWorth.data.firstTransactionDate : null,
			),
		},
	}
}
