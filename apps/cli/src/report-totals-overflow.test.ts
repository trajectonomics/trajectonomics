import { describe, expect, it } from "bun:test"
import { chartHome } from "./account-value-support"
import type { Traj } from "./tx-test-support"

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
type TrialRow = { account: { name: string }; debit: string; credit: string }

const names = (rows: Row[]) => rows.map((row) => `${row.account.name} ${row.amount}`)

const SENTENCE = "not stated: every account is in range, but their sum exceeds"

describe("a trial balance whose column total is outside the safe range", () => {
	it("states every row and null totals with the refusal, and exits 0", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["balance", "--as-of", "2026-02-11", "--trial-balance", "--json"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const { trialBalance } = JSON.parse(res.out)
		expect(
			(trialBalance.rows as TrialRow[]).map((r) => `${r.account.name} ${r.debit}/${r.credit}`),
		).toEqual([
			"Equity 0.00/0.00",
			"Food 19.00/0.00",
			"Fund 0.00/9.58",
			"Gains 90071992547393.28/0.00",
			"Home 0.00/0.00",
			"Loan 0.00/90071992547402.70",
		])
		expect(trialBalance.totals).toBeNull()
		expect(trialBalance.totalsError).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			exitCode: 3,
			path: "trialBalance.totals[THB].debit",
		})
		expect(Object.keys(trialBalance)).toEqual(["rows", "totals", "totalsError"])
	})

	it("prints a sentence in place of the totals, and every row", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["balance", "--as-of", "2026-02-11", "--trial-balance"])
		expect(res.code).toBe(0)
		expect(res.out).toContain("90071992547402.70")
		expect(res.out).toContain(SENTENCE)
		expect(res.out).not.toContain("totalsError")
		expect(res.out).not.toContain("AMOUNT_OVERFLOW")
	})

	it("states the totals of a date before the overdraft, with no sign of the refusal", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["balance", "--as-of", "2026-01-02", "--trial-balance", "--json"])
		const { trialBalance } = JSON.parse(res.out)
		expect(trialBalance.totals).toEqual([
			{ currency: "THB", debit: "90071992547402.70", credit: "90071992547402.70" },
		])
		expect(trialBalance).not.toHaveProperty("totalsError")
	})

	it("is the read the Dashboard makes: net worth and the trial balance are both unavailable", async () => {
		const { traj } = await overdrawnHome()
		const data = JSON.parse(
			(await traj(["balance", "--as-of", "2026-02-11", "--trial-balance", "--json"])).out,
		)
		expect(data.netWorth).toBeNull()
		expect(data.trialBalance.totals).toBeNull()
		expect(names(data.rows)).toHaveLength(6)
	})
})

describe("a P&L whose total is outside the safe range", () => {
	it("states every row and null totals with the refusal, and exits 0", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["report", "pnl", "--until", "2026-02-11", "--json"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const data = JSON.parse(res.out)
		expect(names(data.rows)).toEqual(["Food 19.00", "Gains 90071992547393.28"])
		expect(data.totals).toBeNull()
		expect(data.totalsError).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			exitCode: 3,
			path: "totals[THB]",
		})
		expect(Object.keys(data)).toEqual([
			"since",
			"until",
			"project",
			"rows",
			"totals",
			"totalsError",
		])
	})

	it("prints a sentence in place of the total, and every row", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["report", "pnl", "--until", "2026-02-11"])
		expect(res.code).toBe(0)
		expect(res.out).toContain("90071992547393.28")
		expect(res.out).toContain(
			`${SENTENCE} the safe integer range; each account's amount above is stated`,
		)
		expect(res.out).not.toContain("totalsError")
	})

	it("states the total of a period before the overdraft", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj(["report", "pnl", "--until", "2026-01-31", "--json"])
		const data = JSON.parse(res.out)
		expect(data.totals).toEqual([{ currency: "THB", amount: "-90071992547393.28" }])
		expect(data).not.toHaveProperty("totalsError")
	})
})

describe("report networth --monthly in human output", () => {
	it("prints the sentence for each refused month, not the null and the error block", async () => {
		const { traj } = await overdrawnHome()
		const res = await traj([
			"report",
			"networth",
			"--monthly",
			"--since",
			"2026-01-01",
			"--until",
			"2026-03-31",
		])
		expect(res.code).toBe(0)
		expect(res.out.split(SENTENCE)).toHaveLength(3)
		expect(res.out).not.toContain("totalsError")
		expect(res.out).not.toContain("totals: null")
		expect(res.out).not.toContain("AMOUNT_OVERFLOW")
		expect(res.out).toContain("-90071992547393.28")
	})
})
