import { describe, expect, it } from "bun:test"
import { AS_OF, dateFlags, projection, projectionHome } from "./projection/testing"
import { annualRows, bodyOf } from "./projection-compare-support"
import { capture } from "./test-support"

/*
 * The change for each Annual roll-up of a compare (cli ADR-0049, amended). Every change is b minus
 * a, computed in the CLI from the engine's integer minor units. The hand-checks in the comments are
 * the arithmetic a person can redo: the fixture salary is 8000000 minor units a month (80000.00 THB),
 * and a year holds twelve payments.
 */

describe("projection compare reports the change for each Annual roll-up", () => {
	it("states a year's change as b minus a, from the engine's integers", async () => {
		const home = await projectionHome()
		const body = bodyOf(
			await projection(home, [
				"compare",
				"base",
				"--set",
				"flows.salary.amount=9000000",
				...dateFlags(),
			]),
		)
		const [year] = annualRows(body)
		expect(annualRows(body)).toHaveLength(1)
		// Hand check: a's salary is 8000000 a month, twelve payments: 96000000 minor = 960000.00.
		// b's is 9000000 a month: 108000000 minor = 1080000.00. The change is 108000000 - 96000000 =
		// 12000000 minor = 120000.00, and the income row carries the engine's own sums, not a delta
		// of printed strings.
		expect(year?.income).toEqual({ a: "960000.00", b: "1080000.00", delta: "120000.00" })
		expect(year).toMatchObject({ index: 0, from: "2026-03-31", to: "2027-03-30" })
		expect(year?.periods).toEqual({
			a: { from: "2026-03-31", to: "2027-03-30" },
			b: { from: "2026-03-31", to: "2027-03-30" },
		})
		// The two sides share a period, so the closing net worth has a change too.
		expect(year?.closingNetWorth.delta).toMatch(/^-?[0-9]+\.[0-9]{2}$/)
	})

	it("matches a what-if against the same change stored as a fork (cli ADR-0056)", async () => {
		const home = await projectionHome()
		const sets = ["--set", "flows.salary.amount=12000000"]
		const whatIf = bodyOf(await projection(home, ["compare", "base", ...dateFlags(), ...sets]))
		const forked = await capture(["scenario", "fork", "base", "raised", ...sets, "--json"], {
			TRAJ_HOME: home,
		})
		expect(forked.code).toBe(0)
		const stored = bodyOf(await projection(home, ["compare", "base", "raised", ...dateFlags()]))
		expect(whatIf.tables).toEqual(stored.tables)
	})

	it("reports the same change for --decimal, which converts the amount to minor units", async () => {
		const home = await projectionHome()
		const body = bodyOf(
			await projection(home, [
				"compare",
				"base",
				"--set",
				'flows.salary.amount="90000.50"',
				"--decimal",
				...dateFlags(),
			]),
		)
		// Hand check: 90000.50 THB is 9000050 minor. 9000050 - 8000000 = 1000050 a month, and twelve
		// months is 12000600 minor, which is 120006.00.
		expect(annualRows(body)[0]?.income.delta).toBe("120006.00")
	})

	it("says each side's change is zero when the two Scenarios are the same", async () => {
		const home = await projectionHome()
		const body = bodyOf(await projection(home, ["compare", "base", "base", ...dateFlags()]))
		const [first] = annualRows(body)
		expect(first?.closingNetWorth.b).toBe(first?.closingNetWorth.a)
		expect(first?.closingNetWorth.delta).toBe("0.00")
	})

	it("has no change for a year after a side runs out part-way through it", async () => {
		const home = await projectionHome()
		// drained-2029 spends its wealth on 2029-06-30, inside the fourth year: side A's last period
		// is partial and ends on that day, while side B's is whole.
		const body = bodyOf(
			await projection(home, [
				"compare",
				"drained-2029",
				"base",
				"--as-of",
				AS_OF,
				"--horizon",
				"2030-03-30",
			]),
		)
		const rows = annualRows(body)
		expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3])
		// Before the run-out the two sides are the same plan, so the years share a period and a change.
		expect(rows[0]?.closingNetWorth.delta).toBe("0.00")
		expect(rows[2]?.closingNetWorth.delta).toBe("0.00")
		// The fourth year differs: A stops at its run-out day, B runs to the anniversary. Both figures
		// are stated, but the periods are not comparable, so there is no shared period and no delta.
		expect(rows[3]?.periods.a?.to).toBe("2029-06-30")
		expect(rows[3]?.periods.b?.to).toBe("2030-03-30")
		expect(rows[3]).toMatchObject({ from: null, to: null })
		expect(rows[3]?.closingNetWorth.a).not.toBeNull()
		expect(rows[3]?.closingNetWorth.b).not.toBeNull()
		expect(rows[3]?.closingNetWorth.delta).toBeNull()
	})

	it("states null for the side that has no such year, and no change", async () => {
		const home = await projectionHome()
		// drained-2027 runs out in its second year, so it has no third year at all.
		const body = bodyOf(
			await projection(home, [
				"compare",
				"drained-2027",
				"base",
				"--as-of",
				AS_OF,
				"--horizon",
				"2030-03-30",
			]),
		)
		const rows = annualRows(body)
		expect(rows[2]).toMatchObject({ index: 2, from: null, to: null })
		expect(rows[2]?.periods.a).toBeNull()
		expect(rows[2]?.periods.b).not.toBeNull()
		expect(rows[2]?.closingNetWorth).toMatchObject({ a: null, delta: null })
		expect(rows[2]?.closingNetWorth.b).not.toBeNull()
		expect(rows[2]?.income).toMatchObject({ a: null, delta: null })
	})

	it("states the Levy's change only where both sides hold a Levy", async () => {
		const home = await projectionHome()
		// Only the second Scenario holds a Levy: its figure is on that side, and the change has no meaning.
		const oneSided = bodyOf(await projection(home, ["compare", "base", "levied", ...dateFlags()]))
		expect(annualRows(oneSided)[0]?.levy).toMatchObject({ a: null, delta: null })
		expect(annualRows(oneSided)[0]?.levy?.b).toMatch(/^-?[0-9]+\.[0-9]{2}$/)
		// Both sides hold the Levy, so both figures and their change are stated.
		const bothSided = bodyOf(
			await projection(home, ["compare", "levied", "levied", ...dateFlags()]),
		)
		expect(annualRows(bothSided)[0]?.levy?.delta).toBe("0.00")
	})

	it("has no levy key in a compare where neither side holds a Levy", async () => {
		const home = await projectionHome()
		const body = bodyOf(await projection(home, ["compare", "base", "unreachable", ...dateFlags()]))
		for (const row of annualRows(body)) expect(row).not.toHaveProperty("levy")
	})

	it("prints the annual table after the figures in the human Format, and not the JSON key", async () => {
		const home = await projectionHome()
		const res = await capture(["projection", "compare", "base", "unreachable", ...dateFlags()], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("annual (1 row)")
		expect(res.out).toContain("closing A")
		expect(res.out).toContain("A blank change is a year whose period differs")
		expect(res.out).not.toContain("tables:")
		// The figures come first: the table is after the deltas.
		expect(res.out.indexOf("deltas:")).toBeLessThan(res.out.indexOf("annual (1 row)"))
	})
})
