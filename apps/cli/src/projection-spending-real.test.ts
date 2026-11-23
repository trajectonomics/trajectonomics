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

describe("the example's rule, in today's money", () => {
	const run = async () =>
		runBody(await projection(await exampleHome(), ["run", ...EXAMPLE_FLAGS, "--spending"]))

	it("deflates the first year's amount by 3% from the plan's start as the engine counts it, to the satang", async () => {
		const [first] = yearsOf(await run(), "retirement-spending")
		// By hand: 2026-01-15 to 2045-01-01 is 6,926 calendar days less 5 Feb 29s, 6,921 counted days. The
		// amount is 1,187,523 satang and 1.03^(6921/365) = 1.7516..., so the real amount is 677,996.02,
		// 677,996 satang once rounded, well clear of a tie. The check is on whole satang, no tolerance.
		expect(first?.date).toBe("2045-01-01")
		expect(minor(first?.amount ?? "0")).toBe(1_187_523n)
		expect(minor(first?.realAmount ?? "0")).toBe(677_996n)
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
