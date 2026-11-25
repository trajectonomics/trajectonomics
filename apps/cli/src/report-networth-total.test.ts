import { describe, expect, it } from "bun:test"
import { chartHome } from "./account-value-support"
import { FIXTURE_AS_OF, fixtureHome } from "./ledger-fixture"
import { capture } from "./test-support"
import { cli, type Traj } from "./tx-test-support"

/** A Loan at 90071992547402.70, which every Balance can hold, and a Fund that is 9.58 overdrawn. */
async function overdrawnHome(): Promise<{ home: string; traj: Traj }> {
	const { home, traj } = await chartHome()
	const loan = ["--value", "90071992547402.70", "--date", "2026-01-01", "--against", "Gains"]
	expect((await traj(["account", "value", "Loan", ...loan, "--json"])).code).toBe(0)
	const fund = ["--value", "9.42", "--date", "2026-01-01", "--against", "Gains"]
	expect((await traj(["account", "value", "Fund", ...fund, "--json"])).code).toBe(0)
	const spend = ["--from", "Fund", "--to", "Food", "--amount", "19.00", "--date", "2026-02-10"]
	expect((await traj(["tx", "add", ...spend, "--json"])).code).toBe(0)
	return { home, traj }
}

type Row = { account: { name: string }; amount: string }
type Total = { currency: string; amount: string }

const names = (rows: Row[]) => rows.map((row) => `${row.account.name} ${row.amount}`)

describe("a net worth total outside the safe range", () => {
	it("leaves `balance` stating every account and no total, and exits 0", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["balance", "--as-of", "2026-02-11", "--json"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const data = JSON.parse(res.out)
		expect(names(data.rows)).toEqual([
			"Equity 0.00",
			"Food 19.00",
			"Fund -9.58",
			"Gains 90071992547393.28",
			"Home 0.00",
			"Loan -90071992547402.70",
		])
		expect(data.netWorth).toBeNull()
		expect(data.netWorthError).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			exitCode: 3,
			path: "netWorth[THB]",
		})
	})

	it("leaves `report networth` stating the asset and liability rows and no total, and exits 0", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["report", "networth", "--as-of", "2026-02-11", "--json"])
		expect(res.code).toBe(0)
		const data = JSON.parse(res.out)
		expect(names(data.rows)).toEqual(["Fund -9.58", "Home 0.00", "Loan -90071992547402.70"])
		expect(data.totals).toBeNull()
		expect(data.totalsError).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			exitCode: 3,
			path: "totals[THB]",
		})
		expect(Object.keys(data)).toEqual([
			"asOf",
			"firstTransactionDate",
			"noTransactionsBefore",
			"rows",
			"totals",
			"totalsError",
		])
	})

	it("states the months before the overdraft with their total and the months after without one", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj([
			"report",
			"networth",
			"--monthly",
			"--since",
			"2026-01-01",
			"--until",
			"2026-03-31",
			"--json",
		])
		expect(res.code).toBe(0)
		const months = JSON.parse(res.out).months as {
			asOf: string
			rows: Row[]
			totals: Total[] | null
			totalsError?: { code: string }
		}[]
		expect(months.map((month) => month.asOf)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"])
		expect(months[0]?.totals).toEqual([{ currency: "THB", amount: "-90071992547393.28" }])
		expect(months[0]).not.toHaveProperty("totalsError")
		for (const month of months.slice(1)) {
			expect(month.totals).toBeNull()
			expect(month.totalsError?.code).toBe("AMOUNT_OVERFLOW")
			expect(names(month.rows)).toEqual(["Fund -9.58", "Home 0.00", "Loan -90071992547402.70"])
		}
	})

	it("states each month exactly as --as-of states that date", async () => {
		const { home, traj } = await overdrawnHome()
		const month = await traj(["report", "networth", "--monthly", "--until", "2026-02-28", "--json"])
		const dates = ["2026-01-31", "2026-02-28"]
		const single = await Promise.all(
			dates.map(async (date) =>
				JSON.parse((await cli(home)(["report", "networth", "--as-of", date, "--json"])).out),
			),
		)
		expect(JSON.parse(month.out).months).toEqual(single)
	})

	it("prints a sentence in place of the total, and still every account", async () => {
		const { traj } = await overdrawnHome()
		for (const argv of [
			["balance", "--as-of", "2026-02-11"],
			["report", "networth", "--as-of", "2026-02-11"],
		]) {
			const res = await traj(argv)
			expect(res.code).toBe(0)
			expect(res.out).toContain("-90071992547402.70")
			expect(res.out).toContain("not stated: every account is in range, but their sum exceeds")
			expect(res.out).not.toContain("Error")
		}
	})
})

describe("a net worth total inside the safe range", () => {
	it("carries no sign of the refusal in `balance` or `report networth`", async () => {
		const home = fixtureHome()
		const balance = JSON.parse(
			(await capture(["balance", "--as-of", FIXTURE_AS_OF, "--json"], { TRAJ_HOME: home })).out,
		)
		expect(Array.isArray(balance.netWorth)).toBe(true)
		expect(balance).not.toHaveProperty("netWorthError")
		const worth = JSON.parse(
			(
				await capture(["report", "networth", "--as-of", FIXTURE_AS_OF, "--json"], {
					TRAJ_HOME: home,
				})
			).out,
		)
		expect(Array.isArray(worth.totals)).toBe(true)
		expect(worth).not.toHaveProperty("totalsError")
	})

	it("states the total of a Loan and a Fund that are both in range", async () => {
		const { home } = await chartHome()
		const traj = cli(home)
		const loan = ["--value", "90071992547402.70", "--date", "2026-01-01", "--against", "Gains"]
		await traj(["account", "value", "Loan", ...loan, "--json"])
		await traj([
			"account",
			"value",
			"Fund",
			"--value",
			"9.42",
			"--date",
			"2026-01-01",
			"--against",
			"Gains",
			"--json",
		])
		const data = JSON.parse((await traj(["balance", "--as-of", "2026-01-02", "--json"])).out)
		expect(data.netWorth).toEqual([{ currency: "THB", amount: "-90071992547393.28" }])
	})
})
