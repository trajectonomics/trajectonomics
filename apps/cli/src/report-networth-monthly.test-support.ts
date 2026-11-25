import { FIXTURE_ROWS } from "./ledger-fixture"
import { FIXTURE_ACCOUNTS, posting, transaction } from "./ledger-fixture/rows"
import type { RestoreRows } from "./store"
import { capture } from "./test-support"

/** The `YYYY-MM-DD` month-ends of `count` months from a year and month, oldest first. */
export function monthEnds(year: number, month: number, count: number): string[] {
	return Array.from({ length: count }, (_, at) => {
		const index = year * 12 + (month - 1) + at
		const y = Math.floor(index / 12)
		const m = (index % 12) + 1
		const day = new Date(Date.UTC(y, m, 0)).getUTCDate()
		return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
	})
}

/**
 * A Ledger with one balanced Transaction in the middle of each of `months` months from Nov 2016,
 * moving a different amount into the Bank and the Investment against a growing Loan, so no two
 * month-ends state the same figures.
 */
export function longRows(months: number): RestoreRows {
	const dates = monthEnds(2016, 11, months).map((date) => `${date.slice(0, 8)}15`)
	const ids = dates.map((_, at) => `0194b100-${String(at).padStart(4, "0")}-7000-8000-000000000000`)
	return {
		...FIXTURE_ROWS,
		tx: dates.map((date, at) => transaction(ids[at] ?? "", date)),
		posting: dates.flatMap((_, at) => {
			const bank = 100_00 + at * 37_01
			const fund = 50_00 + at * 11_13
			const loan = 20_00 + at * 3_07
			const id = ids[at] ?? ""
			return [
				posting(id, 0, FIXTURE_ACCOUNTS.bank, bank),
				posting(id, 1, FIXTURE_ACCOUNTS.investment, fund),
				posting(id, 2, FIXTURE_ACCOUNTS.loan, -loan),
				posting(id, 3, FIXTURE_ACCOUNTS.opening, loan - bank - fund),
			]
		}),
	}
}

/** What the single-date read gives for each date: its data, or its error envelope's `error`. */
export async function singleReads(home: string, dates: string[]): Promise<unknown[]> {
	const reads: unknown[] = []
	for (const date of dates) {
		const res = await capture(["report", "networth", "--as-of", date, "--json"], {
			TRAJ_HOME: home,
		})
		reads.push(
			res.code === 0 ? JSON.parse(res.out) : { asOf: date, error: JSON.parse(res.err).error },
		)
	}
	return reads
}
