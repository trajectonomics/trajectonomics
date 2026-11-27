import { describe, expect, it } from "bun:test"
import { RATES_AS_OF, ratesFixtureHome } from "./baseline-rates-fixture"
import { seededHome } from "./ledger-fixture"
import { account, ENTITY, posting, transaction } from "./ledger-fixture/rows"
import type { PostingRow, RestoreRows, TxRow } from "./store"
import { ledgerHome } from "./store/testing"
import { capture } from "./test-support"

const ACCOUNTS = {
	cash: "0194c200-0001-7000-8000-000000000001",
	opening: "0194c200-0002-7000-8000-000000000002",
	food: "0194c200-0003-7000-8000-000000000003",
} as const

type Spend = { date: string; amount: number }

/** A Ledger whose record opens on `firstDate`, with one expense per `spend` entry. */
function homeOf(firstDate: string, spend: readonly Spend[]): string {
	const tx: TxRow[] = []
	const postings: PostingRow[] = []
	let count = 0
	const write = (date: string, debit: string, credit: string, amount: number): void => {
		count += 1
		const id = `0194c300-${String(count).padStart(4, "0")}-7000-8000-000000000000`
		tx.push(transaction(id, date))
		postings.push(posting(id, 0, debit, amount), posting(id, 1, credit, -amount))
	}
	write(firstDate, ACCOUNTS.cash, ACCOUNTS.opening, 100_000_000)
	for (const entry of spend) write(entry.date, ACCOUNTS.food, ACCOUNTS.cash, entry.amount)
	const rows: RestoreRows = {
		entity: [ENTITY],
		account: [
			account(ACCOUNTS.cash, "Cash", "asset"),
			account(ACCOUNTS.opening, "Opening", "equity"),
			account(ACCOUNTS.food, "Food", "expense"),
		],
		tx,
		posting: postings,
		scenario: [],
	}
	return seededHome(rows)
}

type Rates = {
	window: { from: string; to: string }
	covered: { from: string; to: string } | null
	monthsCovered: number
	rows: { amount: string; total: string }[]
	totals: { type: string; total: string; monthly: string | null }[]
	hint?: string
}

async function run(
	home: string,
	asOf: string,
	...args: string[]
): Promise<{
	code: number
	out: string
	err: string
	data: Rates
}> {
	const res = await capture(["baseline", "rates", "--as-of", asOf, ...args, "--json"], {
		TRAJ_HOME: home,
	})
	return { ...res, data: JSON.parse(res.code === 0 ? res.out : "{}") as Rates }
}

describe("the baseline rates window", () => {
	it("includes the As-of month only when the As-of is its last day", async () => {
		const home = ratesFixtureHome()
		const lastDay = await run(home, "2026-10-31", "--months", "3")
		expect(lastDay.data.window).toEqual({ from: "2026-08-01", to: "2026-10-31" })
		const midMonth = await run(home, "2026-10-30", "--months", "3")
		expect(midMonth.data.window).toEqual({ from: "2026-07-01", to: "2026-09-30" })
	})

	it("moves coverage to the month after a first Transaction dated mid-month", async () => {
		const home = homeOf("2026-01-15", [{ date: "2026-02-10", amount: 100_00 }])
		const res = await run(home, "2026-04-30", "--months", "4")
		expect(res.code).toBe(0)
		expect(res.data.covered).toEqual({ from: "2026-02-01", to: "2026-04-30" })
		expect(res.data.monthsCovered).toBe(3)
	})

	it("divides a four-month record by the four months it covers", async () => {
		const spend = ["01", "02", "03", "04"].map((month) => ({
			date: `2026-${month}-10`,
			amount: 100_00,
		}))
		const res = await run(homeOf("2026-01-01", spend), "2026-04-30", "--months", "12")
		expect(res.code).toBe(0)
		expect(res.data.monthsCovered).toBe(4)
		expect(res.data.rows[0]?.total).toBe("400.00")
		expect(res.data.rows[0]?.amount).toBe("100.00")
	})

	it("refuses --months outside 3 to 36, and takes both bounds", async () => {
		const home = ratesFixtureHome()
		for (const months of ["2", "37"]) {
			const res = await run(home, RATES_AS_OF, "--months", months)
			expect(res.code).toBe(2)
			expect(JSON.parse(res.err).error).toMatchObject({
				code: "invalid_input",
				path: "--months",
			})
		}
		for (const months of ["3", "36"]) {
			const res = await run(home, RATES_AS_OF, "--months", months)
			expect(res.code).toBe(0)
		}
	})

	it("states an empty Ledger as no rows, no covered month and a hint", async () => {
		const res = await run(ledgerHome(), "2026-03-31")
		expect(res.code).toBe(0)
		expect(res.data.rows).toEqual([])
		expect(res.data.covered).toBeNull()
		expect(res.data.monthsCovered).toBe(0)
		expect(res.data.totals).toEqual([
			{ type: "income", total: "0.00", monthly: null },
			{ type: "expense", total: "0.00", monthly: null },
		])
		expect(res.data.hint).toBe(
			'Run "traj tx add" to record a Transaction, then read the rates again.',
		)
	})

	it("covers no whole month when the record starts in the As-of month", async () => {
		const home = homeOf("2026-03-01", [{ date: "2026-03-05", amount: 100_00 }])
		const res = await run(home, "2026-03-15")
		expect(res.code).toBe(0)
		expect(res.data.monthsCovered).toBe(0)
		expect(res.data.covered).toBeNull()
		expect(res.data.rows).toEqual([])
		const human = await capture(["baseline", "rates", "--as-of", "2026-03-15"], {
			TRAJ_HOME: home,
		})
		expect(human.out).toContain(
			"No full month is recorded before 2026-03-15, so there is no run-rate yet.",
		)
	})
})
