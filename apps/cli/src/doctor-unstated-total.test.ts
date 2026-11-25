import { describe, expect, it } from "bun:test"
import { chartHome } from "./account-value-support"
import type { Traj } from "./tx-test-support"

/** A Loan at 90071992547402.70, which every Balance can hold, and a Fund that is 9.58 overdrawn. */
async function overdrawnTraj(): Promise<Traj> {
	const { traj } = await chartHome()
	const loan = ["--value", "90071992547402.70", "--date", "2026-01-01", "--against", "Gains"]
	expect((await traj(["account", "value", "Loan", ...loan, "--json"])).code).toBe(0)
	const fund = ["--value", "9.42", "--date", "2026-01-01", "--against", "Gains"]
	expect((await traj(["account", "value", "Fund", ...fund, "--json"])).code).toBe(0)
	const spend = ["--from", "Fund", "--to", "Food", "--amount", "19.00", "--date", "2026-02-10"]
	expect((await traj(["tx", "add", ...spend, "--json"])).code).toBe(0)
	return traj
}

describe("doctor on a ledger whose trial balance totals are outside the safe range", () => {
	it("compares the columns exactly, states no totals, and runs every other check", async () => {
		const traj = await overdrawnTraj()
		const res = await traj(["doctor", "--as-of", "2026-02-11", "--json"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const data = JSON.parse(res.out)
		expect(data.ok).toBe(true)
		expect(data.trialBalance).toMatchObject({ asOf: "2026-02-11", totals: null, balanced: true })
		expect(data.trialBalance.totalsError).toMatchObject({
			code: "AMOUNT_OVERFLOW",
			exitCode: 3,
			path: "trialBalance.totals[THB].debit",
		})
		expect(data.checks.map((check: { status: string }) => check.status)).toEqual(
			Array(6).fill("pass"),
		)
		expect(data.checks.at(-1).detail).toContain("compared exactly")
	})

	it("prints a sentence in place of the totals, with no sign of the refusal", async () => {
		const traj = await overdrawnTraj()
		const res = await traj(["doctor", "--as-of", "2026-02-11"])
		expect(res.code).toBe(0)
		expect(res.out).toContain(
			"not stated: every account is in range, but their sum exceeds the safe integer range",
		)
		expect(res.out).toContain("Debits equal credits at 2026-02-11")
		expect(res.out).not.toContain("totalsError")
		expect(res.out).not.toContain("AMOUNT_OVERFLOW")
	})

	it("states the totals of a date before the overdraft, with no error key", async () => {
		const traj = await overdrawnTraj()
		const data = JSON.parse((await traj(["doctor", "--as-of", "2026-01-02", "--json"])).out)
		expect(data.trialBalance.totals).toEqual([
			{ currency: "THB", debit: "90071992547402.70", credit: "90071992547402.70" },
		])
		expect(data.trialBalance).not.toHaveProperty("totalsError")
		expect(data.trialBalance.balanced).toBe(true)
	})
})
