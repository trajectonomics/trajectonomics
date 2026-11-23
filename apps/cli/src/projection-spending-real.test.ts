import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { exampleHome } from "./projection-accounts-support"
import { runBody } from "./projection-run-support"
import {
	EXAMPLE_FLAGS,
	major,
	minor,
	RAISE_FLAGS,
	raiseHome,
	yearsOf,
} from "./projection-spending-support"
import { capture } from "./test-support"

/*
 * What a Rule year pays in today's money (cli ADR-0063, sim ADR-0023): `realAmount` and `realPaid` are
 * the engine's, each deflated once at the Rule year's first date as the row's realNetWorth is. The CLI
 * states them as it states every figure; these tests check them by hand beside the nominal ones.
 */

/** Feb 29s in `(from, to]`, which the engine's Actual/365 No Leap count leaves out. */
function leapDaysBetween(from: string, to: string): number {
	let count = 0
	for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
		const day = `${year}-02-29`
		if (new Date(`${day}T00:00:00Z`).getUTCDate() === 29 && day > from && day <= to) count++
	}
	return count
}

/** The deflator the engine states: `(1 + rate)` to the power of counted days over 365, daily compounded (sim ADR-0023). */
function deflator(from: string, to: string, percent: number): number {
	const days =
		(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 -
		leapDaysBetween(from, to)
	return (1 + percent / 100) ** (days / 365)
}

describe("the example's rule, in today's money", () => {
	const run = async () =>
		runBody(await projection(await exampleHome(), ["run", ...EXAMPLE_FLAGS, "--spending"]))

	it("deflates the first year's amount by 3% from the plan's start as the engine counts it, to the satang", async () => {
		const [first] = yearsOf(await run(), "retirement-spending")
		const expected =
			Number(minor(first?.amount ?? "0")) / deflator("2026-01-15", first?.date ?? "", 3) / 100
		expect(Math.abs(Number(first?.realAmount) - expected)).toBeLessThan(0.02)
		expect(first?.realPaid).toBe(first?.realAmount ?? "")
	})

	it("states a year that keeps pace with inflation as the same real amount, and a cut as 10% less", async () => {
		const years = yearsOf(await run(), "retirement-spending")
		const level = years.slice(0, 4).map((year) => year.realAmount)
		expect(new Set(level).size).toBe(1)
		const cut = years.find((year) => year.action === "cut")
		const before = years[years.indexOf(cut ?? years[0]!) - 1]
		const tenthOff = (minor(before?.realAmount ?? "0") * 9_000n) / 10_000n
		expect(Math.abs(Number(minor(cut?.realAmount ?? "0") - tenthOff))).toBeLessThanOrEqual(2)
	})

	it("states a whole year's real paid as its real amount, and never above the nominal figure", async () => {
		for (const year of yearsOf(await run(), "retirement-spending")) {
			expect(year.realPaid).toBe(year.realAmount)
			expect(minor(year.realAmount)).toBeLessThanOrEqual(minor(year.amount))
		}
	})
})

describe("a plan with no inflation", () => {
	it("states every real figure as the nominal one", async () => {
		const body = runBody(await projection(await raiseHome(), ["run", ...RAISE_FLAGS, "--spending"]))
		for (const year of yearsOf(body, "spending")) {
			expect(year.realAmount).toBe(year.amount)
			expect(year.realPaid).toBe(year.paid)
		}
	})
})

describe("the human form states the real figures", () => {
	it("prints realAmount and realPaid beside the nominal columns", async () => {
		const res = await capture(["projection", "run", ...EXAMPLE_FLAGS, "--spending"], {
			TRAJ_HOME: await exampleHome(),
		})
		const header = res.out.split("\n").find((line) => line.startsWith("date"))
		expect(header).toContain("amount")
		expect(header).toContain("realAmount")
		expect(header).toContain("realPaid")
		expect(major(1n)).toBe("0.01")
	})
})
