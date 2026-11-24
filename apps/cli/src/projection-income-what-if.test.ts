import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { INCOME_FLAGS, INCOME_PLAN, planHome } from "./projection-income-support"
import { runBody, tableOf } from "./projection-run-support"
import { errorOf } from "./test-support"

/*
 * What a plan without the new fields states, a share of 0 bps, and a what-if on a fee (cli ADR-0067).
 */

const fund = (patch: Record<string, unknown>) =>
	INCOME_PLAN.accounts.map((account) =>
		account.id === "fund" ? { ...account, ...patch } : account,
	)

const bare = {
	...INCOME_PLAN,
	accounts: INCOME_PLAN.accounts.map((account) =>
		account.id === "fund" ? { id: "fund", kind: "asset", rate: 600 } : account,
	),
	flows: INCOME_PLAN.flows.filter((flow) => flow.id !== "match"),
}

describe("a plan without a payout, a fee or an employer's share", () => {
	it("states none of the new keys or tables", async () => {
		const res = await projection(await planHome(bare), ["run", ...INCOME_FLAGS, "--breakdown"])
		expect(res.code).toBe(0)
		for (const key of ["payouts", "employerContributions", '"fees"', '"payout"', '"employer"']) {
			expect(res.out).not.toContain(key)
		}
		expect(runBody(res).tables.map((table) => table.name)).toEqual([
			"annual",
			"cashflow",
			"cashflowTotals",
		])
	})

	it("is byte for byte the same table list when a payout and a fee of 0 bps are declared, as the engine treats them as none", async () => {
		const zero = {
			...bare,
			accounts: fund({
				payout: { bps: 0, frequency: "quarterly", rounding: "floor" },
				fee: { bps: 0, rounding: "halfUp" },
			}),
		}
		const plain = runBody(
			await projection(await planHome(bare), ["run", ...INCOME_FLAGS, "--breakdown"]),
		)
		const declared = runBody(
			await projection(await planHome(zero), ["run", ...INCOME_FLAGS, "--breakdown"]),
		)
		expect(JSON.stringify(declared.tables)).toBe(JSON.stringify(plain.tables))
	})
})

describe("a what-if on an Account's fee", () => {
	const feesOf = async (set: readonly string[]): Promise<string> => {
		const res = await projection(await planHome(), ["run", ...INCOME_FLAGS, ...set])
		expect(res.code).toBe(0)
		return tableOf(runBody(res), "annual").rows[0]?.fees ?? ""
	}

	it("moves the fees with one override: 1.5% a year charges 1,514.01, 0.5% charges less", async () => {
		const base = await feesOf([])
		const cheaper = await feesOf(["--set", "accounts.fund.fee.bps=50"])
		expect(base).toBe("1514.01")
		expect(Number(cheaper)).toBeGreaterThan(0)
		expect(Number(cheaper)).toBeLessThan(Number(base) / 2)
	})

	it("takes the share as a percent string with --decimal, and states the same plan", async () => {
		const minor = await projection(await planHome(), [
			"run",
			...INCOME_FLAGS,
			"--set",
			"accounts.fund.fee.bps=50",
		])
		const decimal = await projection(await planHome(), [
			"run",
			...INCOME_FLAGS,
			"--decimal",
			"--set",
			'accounts.fund.fee.bps="0.50"',
		])
		expect(decimal.code).toBe(0)
		const hash = (res: { out: string }) =>
			(JSON.parse(res.out) as { scenario: { effectiveContentHash: string } }).scenario
				.effectiveContentHash
		expect(hash(decimal)).toBe(hash(minor))
	})

	it("refuses a fee above 100% in a sentence at the flag", async () => {
		const res = await projection(await planHome(), [
			"run",
			...INCOME_FLAGS,
			"--set",
			"accounts.fund.fee.bps=10001",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain(
			"fee an Account charges each year must be from 0% to 100%",
		)
	})
})
