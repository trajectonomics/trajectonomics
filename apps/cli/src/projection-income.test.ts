import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { INCOME_FLAGS, linesOf, planHome, satang, taxedHome } from "./projection-income-support"
import { runBody, tableOf } from "./projection-run-support"

/*
 * What an Account's payout and fee and an employer's share did, stated by `projection run` (cli
 * ADR-0067): each figure is the engine's, and the cash-flow lines add up to the totals the same
 * result states.
 */

const run = async (home: string, extra: readonly string[] = []) => {
	const res = await projection(home, ["run", ...INCOME_FLAGS, ...extra])
	expect(res.err).toBe("")
	expect(res.code).toBe(0)
	return runBody(res)
}

describe("the roll-up states what the new fields did, only when they are declared", () => {
	it("adds the employer's 5% of twelve 100,000.00 salaries: 60,000.00, outside income and saving", async () => {
		const first = tableOf(await run(await taxedHome()), "annual").rows[0]
		expect(first?.employerContributions).toBe("60000.00")
		expect(first?.income).toBe("1204051.89")
		expect(first?.contributions).toBe("100000.00")
	})

	it("states the fund's payouts inside income, and its fees outside it", async () => {
		const first = tableOf(await run(await taxedHome()), "annual").rows[0]
		expect(first?.payouts).toBe("4051.89")
		expect(first?.fees).toBe("1514.01")
		// Income is the 12 salaries plus the payouts.
		expect(satang([first?.payouts ?? "", "1200000.00"])).toBe(satang([first?.income ?? ""]))
	})

	it("states the fees of each fee Account in a table whose rows add up to the roll-up's fees", async () => {
		const body = await run(await taxedHome())
		const fees = tableOf(body, "fees")
		expect(fees.rows.map((row) => [row.index, row.account])).toEqual([
			[0, "fund"],
			[1, "fund"],
		])
		for (const row of tableOf(body, "annual").rows) {
			const own = fees.rows.filter((fee) => fee.index === row.index).map((fee) => fee.amount)
			expect(satang(own)).toBe(satang([row.fees ?? ""]))
		}
	})
})

describe("the cash-flow lines add up to the totals", () => {
	it("lists the payout as money in and the employer's share outside it, each with its Account", async () => {
		const body = await run(await taxedHome(), ["--breakdown"])
		expect(linesOf(body, 0, "payout")).toMatchObject([
			{ id: null, account: "fund", amount: "4051.89" },
		])
		expect(linesOf(body, 0, "employer")).toMatchObject([
			{ id: "match", account: "provident", amount: "60000.00" },
		])
		expect(linesOf(body, 0, "prepaid")).toHaveLength(1)
	})

	it("makes income lines plus payout lines plus withdrawals plus drawn equal money in, every year", async () => {
		const body = await run(await taxedHome(), ["--breakdown"])
		for (const row of tableOf(body, "annual").rows) {
			const lines = (group: string) =>
				tableOf(body, "cashflow")
					.rows.filter((line) => line.index === row.index && line.group === group)
					.map((line) => line.amount)
			const moneyIn = tableOf(body, "cashflowTotals").rows.find(
				(total) => total.index === row.index && total.total === "money in",
			)
			const parts = ["income", "payout", "withdrawal", "drawn"].flatMap(lines)
			expect(satang(parts)).toBe(satang([moneyIn?.amount ?? ""]))
		}
	})

	it("keeps money in plus unmet equal to tax, spending, saving and left over, with the new lines", async () => {
		const body = await run(await taxedHome(), ["--breakdown"])
		for (const row of tableOf(body, "annual").rows) {
			const total = (name: string) =>
				tableOf(body, "cashflowTotals").rows.find(
					(entry) => entry.index === row.index && entry.total === name,
				)?.amount ?? ""
			expect(satang([total("money in"), total("unmet")])).toBe(
				satang(["tax", "spending", "saving", "left over"].map(total)),
			)
		}
	})

	it("prints the payout and the employer's share in the human block, each beside the figure the engine states", async () => {
		const home = await planHome()
		const res = await projection(home, ["run", ...INCOME_FLAGS, "--breakdown"])
		expect(res.code).toBe(0)
		const { capture } = await import("./test-support")
		const human = await capture(["projection", "run", ...INCOME_FLAGS, "--breakdown"], {
			TRAJ_HOME: home,
		})
		expect(human.out).toContain("payouts")
		expect(human.out).toContain("employer paid in (not cash)")
		expect(human.out).toContain("fees charged (not cash)")
	})
})
