import type { NetWorth, Read } from "../../lib/contract"
import { historyLine, monthEndRows } from "../../lib/view/net-worth/history"
import type { NetWorthPageView } from "../../lib/view/net-worth/page"
import { netWorthView } from "../../lib/view/net-worth/view"
import { mapRead } from "../../lib/view/overview/map-read"
import { netWorthHistorySeries } from "../../lib/view/overview/net-worth-history"

/** The report's argv for an As-of. */
export const argv = (asOf: string) => ["report", "networth", "--as-of", asOf, "--json"]

/** A single-currency total list in THB. */
export const THB = (amount: string) => [{ currency: "THB", amount }]

/** The Net worth page's view of one headline Read and the month-end reads behind its history. */
export function pageView(read: Read<NetWorth>, reads: Read<NetWorth>[] = []): NetWorthPageView {
	return {
		netWorth: mapRead(read, netWorthView),
		history: {
			series: netWorthHistorySeries(reads),
			rows: monthEndRows(reads),
			line: historyLine(reads),
		},
	}
}
