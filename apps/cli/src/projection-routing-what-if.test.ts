import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { linesOf } from "./projection-income-read"
import { PLAIN_PLAN, ROUTING_FLAGS, routingHome } from "./projection-routing-plan"
import { runBody } from "./projection-run-support"
import { echoed } from "./projection-what-if-support"
import { errorOf } from "./scenario-test-support"

/*
 * A what-if on where the money goes (cli ADR-0070, ADR-0056): `--set` reaches a step's share and cap and an
 * entry's floor by position, in the minor-unit and the decimal form, and a floor the plan did not state is
 * begun. Every figure is the plan's, worked in projection-routing-plan.ts.
 */

const run = (home: string, extra: readonly string[]) =>
	projection(home, ["run", ...ROUTING_FLAGS, "--breakdown", ...extra])

const drawn = (res: { out: string }) =>
	linesOf(runBody(res as Parameters<typeof runBody>[0]), 0, "drawn").map((line) => [
		line.entry,
		line.account,
		line.amount,
	])

describe("--set a floor", () => {
	it("keeps 90,000.00 in `emergency` before touching the funds: the first draw is 10,000.00, the last 79,000.00", async () => {
		const res = await run(await routingHome(), ["--set", "cashflow.withdraw.0.downTo=9000000"])
		expect(res.code).toBe(0)
		// 330,000.00 to find: 10,000.00 down to the new floor, all 241,000.00 of `funds`, then 79,000.00 of `emergency`.
		expect(drawn(res)).toEqual([
			[0, "emergency", "10000.00"],
			[1, "funds", "241000.00"],
			[2, "emergency", "79000.00"],
		])
		expect(echoed(res).overrides).toEqual([
			{ path: "cashflow.withdraw.0.downTo", value: 9_000_000 },
		])
	})

	it("reads the same what-if in major units under --decimal, and echoes the value as given", async () => {
		const home = await routingHome()
		const minor = await run(home, ["--set", "cashflow.withdraw.0.downTo=9000000"])
		const decimal = await run(home, ["--decimal", "--set", 'cashflow.withdraw.0.downTo="90000.00"'])
		expect(decimal.code).toBe(0)
		expect(drawn(decimal)).toEqual(drawn(minor))
		expect(echoed(decimal).overrides).toEqual([
			{ path: "cashflow.withdraw.0.downTo", value: "90000.00" },
		])
		expect(echoed(decimal).scenario.effectiveContentHash).toBe(
			echoed(minor).scenario.effectiveContentHash,
		)
	})

	it("reads a floor that keeps its value, in both forms, as the same document", async () => {
		const home = await routingHome()
		const minor = await run(home, [
			"--set",
			'cashflow.withdraw.0.downTo={"amount":9000000,"growth":"inflation"}',
		])
		const decimal = await run(home, [
			"--decimal",
			"--set",
			'cashflow.withdraw.0.downTo={"amount":"90000.00","growth":"inflation"}',
		])
		expect(drawn(decimal)).toEqual(drawn(minor))
		expect(echoed(decimal).scenario.effectiveContentHash).toBe(
			echoed(minor).scenario.effectiveContentHash,
		)
	})

	it("begins a floor on an entry that is a bare id, and the floor stops the draw: the run ends unmet", async () => {
		// `funds` holds 241,000.00 on 1 October, under a floor of 250,000.00, so it gives nothing; `emergency`
		// gives 80,000.00 and then its last 20,000.00, and 230,000.00 of the 330,000.00 is unmet.
		const res = await run(await routingHome(), ["--set", "cashflow.withdraw.1.downTo=25000000"])
		expect(res.code).toBe(0)
		expect(runBody(res).runsOut).toEqual({ date: "2026-10-01", unmet: "230000.00" })
	})

	it("begins a floor on a plan with no routing form, and states the routing then", async () => {
		const res = await run(await routingHome(PLAIN_PLAN), [
			"--set",
			"cashflow.withdraw.0.downTo=100000",
		])
		expect(res.code).toBe(0)
		expect(runBody(res).routing?.withdraw).toEqual([
			{ entry: 0, account: "cash", downTo: { amount: "1000.00", growth: null } },
		])
	})
})

describe("--set a share or a cap", () => {
	const SHORT = ["--as-of", "2026-01-01", "--horizon", "2026-02-28"]
	const surplusOf = async (set: readonly string[]) => {
		const res = await projection(await routingHome(), [
			"run",
			"--scenario",
			"plan",
			...SHORT,
			"--breakdown",
			...set,
		])
		expect(res.code).toBe(0)
		return linesOf(runBody(res), 0, "surplus").map((line) => [line.account, line.amount])
	}

	it("takes half of what is left by the plan: February's 33,000.00 puts 16,500.00 in `funds`", async () => {
		expect(await surplusOf([])).toEqual([
			["emergency", "100000.00"],
			["funds", "16500.00"],
			["cash", "16500.00"],
		])
	})

	it("takes a quarter when the share is 2500: 8,250.00, and the rest moves on to `cash`", async () => {
		expect(await surplusOf(["--set", "cashflow.surplus.1.share=2500"])).toEqual([
			["emergency", "100000.00"],
			["funds", "8250.00"],
			["cash", "24750.00"],
		])
	})

	it("caps a step by a target: `funds` up to 5,000.00 takes 5,000.00, and the rest goes to `cash`", async () => {
		expect(await surplusOf(["--set", "cashflow.surplus.1.upTo=500000"])).toEqual([
			["emergency", "100000.00"],
			["funds", "5000.00"],
			["cash", "28000.00"],
		])
	})

	it("reaches the amount inside a target that keeps its value, and begins a share the step had none of", async () => {
		const res = await projection(await routingHome(), [
			"run",
			"--scenario",
			"plan",
			...SHORT,
			"--set",
			"cashflow.surplus.0.upTo.amount=5000000",
			"--set",
			"cashflow.surplus.0.share=2000",
		])
		expect(res.code).toBe(0)
		expect(runBody(res).routing?.surplus[0]).toEqual({
			entry: 0,
			account: "emergency",
			upTo: { amount: "50000.00", growth: "inflation" },
			share: 2000,
		})
	})
})

describe("--set refusals on the routing", () => {
	const refused = async (set: string) => {
		const res = await run(await routingHome(), ["--set", set])
		expect(res.code).toBe(2)
		return errorOf(res)
	}

	it("names the positions a list holds when a position is not one", async () => {
		const error = await refused("cashflow.surplus.7.share=1000")
		expect(error.path).toBe("--set")
		expect(error.message).toContain('No entry "7"')
		expect(error.hint).toContain("numbered 0 to 2")
		const named = await refused("cashflow.surplus.emergency.share=1000")
		expect(named.message).toContain('No entry "emergency"')
	})

	it("states a share on the last step in words, and a share out of range", async () => {
		const last = await refused("cashflow.surplus.2.share=1000")
		expect(last.message).toContain("SURPLUS_SHARE_LAST")
		expect(last.message).toContain("the last step must take everything that is left")
		const range = await refused("cashflow.surplus.1.share=10001")
		expect(range.message).toContain("RATE_OUT_OF_RANGE")
	})

	it("states a floor that is not lower than the one before it", async () => {
		const error = await refused(
			'cashflow.withdraw=[{"account":"emergency","downTo":2000000},{"account":"emergency","downTo":2000000}]',
		)
		expect(error.message).toContain("WITHDRAW_FLOOR_ORDER")
	})

	it("refuses a number where the decimal form wants a string, naming the path", async () => {
		const res = await run(await routingHome(), [
			"--decimal",
			"--set",
			"cashflow.withdraw.0.downTo=9000000",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain("cashflow.withdraw.0.downTo")
		expect(errorOf(res).message).toContain("JSON number")
	})
})
