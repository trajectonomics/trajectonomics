import type { NetWorth, ProjectionRun, Read } from "../../contract"
import type { MonthlyRow } from "../projection/annual"
import { projectionRunFixture } from "../projection/fixtures.test-support"

/** A successful net worth Read at one date, stating the given currency totals. */
export function netWorthRead(asOf: string, totals: NetWorth["totals"]): Read<NetWorth> {
	return {
		argv: ["report", "networth", "--as-of", asOf, "--json"],
		ok: true,
		data: { asOf, firstTransactionDate: null, noTransactionsBefore: false, rows: [], totals },
	}
}

/** One monthly row at a date, with the CLI's net worth as its amount; the other figures repeat it. */
export function monthly(date: string, netWorth: string): MonthlyRow {
	return {
		date,
		ages: [],
		netWorth,
		realNetWorth: netWorth,
		accessibleNetWorth: netWorth,
		realAccessibleNetWorth: netWorth,
	}
}

/** A projection run holding only the monthly table, so a month's row can be picked by its date. */
export function monthlyRun(
	rows: readonly MonthlyRow[],
	runsOut: ProjectionRun["runsOut"] = null,
): ProjectionRun {
	return {
		...projectionRunFixture({ runsOut }),
		tables: [{ name: "monthly", count: rows.length, rows: [...rows] }],
	}
}
