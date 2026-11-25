import { describe, expect, it } from "bun:test"
import { isAppError } from "./errors"
import { ACCOUNT_HINT } from "./hint"
import { FIXTURE_AS_OF, fixtureHome, overflowRows, seededHome } from "./ledger-fixture"
import { netWorthOf, netWorthReader } from "./report/networth"
import { type MonthlyInput, netWorthMonthlyOf } from "./report/networth-monthly"
import { longRows, monthEnds, singleReads } from "./report-networth-monthly.test-support"
import type { Ledger } from "./store"
import { ledgerHome, must, mustOpen } from "./store/testing"
import { capture, errorOf } from "./test-support"

function monthly(home: string, ...args: string[]) {
	return capture(["report", "networth", "--monthly", ...args, "--json"], { TRAJ_HOME: home })
}

type Monthly = { since: string | null; until: string; months: unknown[]; hint?: string }

describe("report networth --monthly", () => {
	it("states exactly what --as-of states at each of 120 month-ends", async () => {
		const home = seededHome(longRows(125))
		const dates = monthEnds(2016, 11, 120)
		const res = await monthly(home, "--since", "2016-11-01", "--until", "2026-10-31")
		expect(res.code).toBe(0)
		const data = JSON.parse(res.out) as Monthly
		expect(data.months).toHaveLength(120)
		expect(data.months).toEqual(await singleReads(home, dates))
		const totals = data.months.map((month) => JSON.stringify((month as { totals: unknown }).totals))
		expect(new Set(totals).size).toBe(120)
	})

	it("starts at the month of the first Transaction when --since is left out", async () => {
		const home = seededHome(longRows(14))
		const dates = monthEnds(2016, 11, 14)
		const data = JSON.parse((await monthly(home, "--until", "2017-12-31")).out) as Monthly
		expect(data).toMatchObject({ since: null, until: "2017-12-31" })
		expect(data.months).toEqual(await singleReads(home, dates))
	})

	it("includes only the month-ends inside an inclusive period, and states the record not started before it", async () => {
		const home = fixtureHome()
		const res = await monthly(home, "--since", "2025-11-30", "--until", FIXTURE_AS_OF)
		const data = JSON.parse(res.out) as Monthly
		expect(data.months).toEqual(
			await singleReads(home, [
				"2025-11-30",
				"2025-12-31",
				"2026-01-31",
				"2026-02-28",
				"2026-03-31",
			]),
		)
		expect(data.months[0]).toMatchObject({
			noTransactionsBefore: true,
			firstTransactionDate: "2026-01-01",
		})
		const mid = await monthly(home, "--since", "2026-01-15", "--until", "2026-03-30")
		expect((JSON.parse(mid.out) as Monthly).months).toHaveLength(2)
	})

	it("states no month when the period holds no month-end", async () => {
		const res = await monthly(fixtureHome(), "--since", "2026-02-01", "--until", "2026-02-27")
		expect(JSON.parse(res.out)).toEqual({ since: "2026-02-01", until: "2026-02-27", months: [] })
	})

	it("states a Ledger with no Transaction as no month and the command that fills it", async () => {
		const res = await monthly(ledgerHome(), "--until", FIXTURE_AS_OF)
		expect(res.code).toBe(0)
		expect(JSON.parse(res.out)).toEqual({
			since: null,
			until: FIXTURE_AS_OF,
			months: [],
			hint: ACCOUNT_HINT,
		})
	})

	it("refuses an overflowing month as --as-of does and still states the others", async () => {
		const home = seededHome(overflowRows())
		const dates = ["2025-12-31", "2026-01-31", "2026-02-28", "2026-03-31"]
		const single = await capture(["report", "networth", "--as-of", "2026-01-31", "--json"], {
			TRAJ_HOME: home,
		})
		expect(single.code).toBe(3)
		const res = await monthly(home, "--since", "2025-12-01", "--until", FIXTURE_AS_OF)
		expect(res.code).toBe(0)
		const data = JSON.parse(res.out) as Monthly
		expect(data.months).toEqual(await singleReads(home, dates))
		expect(data.months[0]).toHaveProperty("totals")
		expect(data.months[1]).toEqual({ asOf: "2026-01-31", error: errorOf(single) })
		expect(data.months[1]).toMatchObject({ error: { code: "AMOUNT_OVERFLOW", path: "totals" } })
	})

	it("is byte-identical for the same database and arguments", async () => {
		const home = fixtureHome()
		const args = ["--since", "2026-01-01", "--until", FIXTURE_AS_OF]
		expect(await monthly(home, ...args)).toEqual(await monthly(home, ...args))
	})
})

/** The fixture Ledger with its first Transaction listed twice: a damaged database the scan refuses. */
function duplicated(): Ledger {
	const store = mustOpen(fixtureHome())
	const ledger = must(store.ledger())
	store.close()
	const [first] = ledger.transactions
	if (first === undefined) throw new Error("the fixture holds no Transaction")
	return { ...ledger, transactions: [first, ...ledger.transactions] }
}

describe("report networth --monthly on a Ledger the scan refuses", () => {
	it("hands back the scan's refusal once, in place of a reader", () => {
		const read = netWorthReader(duplicated())
		expect(isAppError(read)).toBe(true)
		expect(isAppError(read) && read.body).toMatchObject({
			code: "DUPLICATE_TRANSACTION_ID",
			exitCode: 3,
		})
	})

	it("is the call's own refusal, whatever range it names", () => {
		const ledger = duplicated()
		const single = netWorthOf(ledger, FIXTURE_AS_OF)
		if (!isAppError(single)) throw new Error("the duplicated Ledger was read")
		const ranges: MonthlyInput[] = [
			{ since: "2026-01-01", until: FIXTURE_AS_OF },
			{ until: FIXTURE_AS_OF },
			// No month-end falls inside this range, and the refusal still states itself.
			{ since: "2026-03-05", until: "2026-03-10" },
		]
		for (const range of ranges) {
			const res = netWorthMonthlyOf(ledger, range)
			expect(isAppError(res)).toBe(true)
			expect(isAppError(res) && res.body).toEqual(single.body)
		}
	})

	it("still checks the range before it reads the Ledger", () => {
		const res = netWorthMonthlyOf(duplicated(), { since: "2026-02-01", until: "2026-01-01" })
		expect(isAppError(res) && res.body).toMatchObject({ code: "INVALID_PERIOD", path: "since" })
	})
})

describe("report networth --monthly refusals", () => {
	it("needs --until, takes no --as-of, and --since and --until need --monthly", async () => {
		const home = ledgerHome()
		const noUntil = await monthly(home, "--since", "2026-01-01")
		expect(noUntil.code).toBe(2)
		expect(errorOf(noUntil)).toMatchObject({ code: "invalid_input", path: "--until" })
		const asOf = await monthly(home, "--as-of", FIXTURE_AS_OF, "--until", FIXTURE_AS_OF)
		expect(asOf.code).toBe(2)
		expect(errorOf(asOf)).toMatchObject({ code: "invalid_input", path: "--as-of" })
		for (const flag of ["--since", "--until"]) {
			const res = await capture(["report", "networth", flag, FIXTURE_AS_OF, "--json"], {
				TRAJ_HOME: home,
			})
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: flag })
		}
	})

	it("refuses a bad date at its flag and an inverted period at --since", async () => {
		const home = ledgerHome()
		const bad = await monthly(home, "--until", "2026-02-30")
		expect(errorOf(bad)).toMatchObject({ code: "INVALID_DATE", path: "until" })
		const year = await monthly(home, "--since", "2569-01-01", "--until", "2569-12-31")
		expect(errorOf(year)).toMatchObject({ code: "INVALID_DATE", path: "since" })
		const inverted = await monthly(home, "--since", "2026-04-01", "--until", FIXTURE_AS_OF)
		expect(inverted.code).toBe(3)
		expect(errorOf(inverted)).toMatchObject({ code: "INVALID_PERIOD", path: "since" })
	})
})
