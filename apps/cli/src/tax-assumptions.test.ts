import { describe, expect, it } from "bun:test"
import type { CompareView } from "./projection/compare-view"
import type { FiView } from "./projection/fi-view"
import { fi, projection, projectionHome } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { scenario } from "./scenario-test-support"
import type { AssumptionView } from "./tax-assumptions"
import { capture } from "./test-support"

const SALARY = ["--label", "salary=income.section40_1"]
const RMF = ["--label", "invest=allowance.retirement.rmf"]
const YEAR_FLAGS: readonly string[] = ["--as-of", "2026-01-01", "--horizon", "2027-12-31"]

const pathsOf = (list: readonly AssumptionView[] | undefined): string[] =>
	(list ?? []).map((it) => it.path)

/** `traj scenario tax base ...` in the human Format, which `scenario()` never uses. */
function humanTax(home: string, argv: readonly string[]) {
	return capture(["scenario", "tax", "base", "--tax", "th-2026", ...argv], { TRAJ_HOME: home })
}

async function taxed(
	argv: readonly string[],
): Promise<{ home: string; out: Record<string, unknown> }> {
	const home = await projectionHome()
	const res = await scenario(home, ["tax", "base", "--tax", "th-2026", ...argv])
	expect(res.code).toBe(0)
	return { home, out: JSON.parse(res.out) as Record<string, unknown> }
}

describe("scenario tax assumptions", () => {
	it("is an empty list when every figure the Levy would use is confirmed", async () => {
		const { out } = await taxed(SALARY)
		expect(out["assumptions"]).toEqual([])
	})

	it("names the figures of the stated allowances and the labelled contributions", async () => {
		const { out } = await taxed([
			"--life-insurance",
			"20000",
			"--health-insurance",
			"5000",
			...SALARY,
			...RMF,
		])
		expect(pathsOf(out["assumptions"] as AssumptionView[])).toEqual([
			"allowances.lifeInsurance.combinedCeiling",
			"allowances.lifeInsurance.healthCeiling",
			"allowances.retirementCluster.combinedCeiling",
			"allowances.retirementCluster.rmf.ceiling",
			"allowances.retirementCluster.rmf.maxRate",
		])
		const [first] = out["assumptions"] as AssumptionView[]
		expect(first).toEqual({
			path: "allowances.lifeInsurance.combinedCeiling",
			value: 100_000,
			status: "reported",
			note: "Life and health insurance ceiling, baht.",
		})
	})

	it("is absent when --none wrote no Levy", async () => {
		const { home } = await taxed(SALARY)
		const res = await scenario(home, ["tax", "base", "--none"])
		expect(JSON.parse(res.out)).not.toHaveProperty("assumptions")
	})

	it("prints an Assumptions block in the human Format only when there is something to name", async () => {
		const home = await projectionHome()
		const plain = await humanTax(home, SALARY)
		expect(plain.code).toBe(0)
		expect(plain.out).not.toContain("Assumptions")
		const stated = await humanTax(home, ["--mortgage-interest", "30000", ...SALARY])
		expect(stated.out).toContain(
			"Assumptions (tax figures used whose source is not yet confirmed):",
		)
		expect(stated.out).toContain(
			"- allowances.mortgageInterestCeiling = 100000 (reported): Home-loan interest ceiling, baht.",
		)
		expect(stated.out.split("assumptions:").length).toBe(1)
	})
})

describe("a Projection's tax years name the assumptions each used", () => {
	it("lists a figure in the years whose tallies used it, and nothing in the others", async () => {
		const { home } = await taxed([...SALARY, ...RMF, "--mortgage-interest", "10000"])
		const body = runBody(await projection(home, ["run", "--scenario", "base", ...YEAR_FLAGS]))
		const year = body.taxYears.find((it) => it.from === "2026-01-01")
		expect(pathsOf(year?.assumptions)).toEqual([
			"allowances.mortgageInterestCeiling",
			"allowances.retirementCluster.combinedCeiling",
			"allowances.retirementCluster.rmf.ceiling",
			"allowances.retirementCluster.rmf.maxRate",
		])
		const earlier = body.taxYears.find((it) => it.from === "2025-01-01")
		expect(pathsOf(earlier?.assumptions)).toEqual(["allowances.mortgageInterestCeiling"])
	})

	it("is empty in every year when nothing used is unconfirmed", async () => {
		const { home } = await taxed(SALARY)
		const body = runBody(await projection(home, ["run", "--scenario", "base", ...YEAR_FLAGS]))
		for (const year of body.taxYears) expect(year.assumptions).toEqual([])
	})

	it("is carried by fi and by each side of a compare", async () => {
		const { home } = await taxed([...SALARY, "--mortgage-interest", "10000"])
		const flags = ["--as-of", "2026-01-01", "--horizon", "2027-12-31"]
		const answer = JSON.parse((await fi(home, ["--scenario", "base", ...flags])).out) as FiView
		expect(answer.taxYears.length).toBeGreaterThan(0)
		for (const year of answer.taxYears)
			expect(pathsOf(year.assumptions)).toContain("allowances.mortgageInterestCeiling")
		const compared = JSON.parse(
			(await projection(home, ["compare", "base", "unreachable", ...flags])).out,
		) as CompareView
		expect(pathsOf(compared.sides.a.taxYears[0]?.assumptions)).toContain(
			"allowances.mortgageInterestCeiling",
		)
	})

	it("prints each figure once under the human tables, not once per year", async () => {
		const { home } = await taxed([...SALARY, "--mortgage-interest", "10000"])
		const res = await capture(["projection", "run", "--scenario", "base", ...YEAR_FLAGS], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		const lines = res.out
			.split("\n")
			.filter((line) => line.startsWith("- allowances.mortgageInterestCeiling"))
		expect(lines).toHaveLength(1)
		expect(res.out).toContain("taxYears")
	})
})

describe("traj schema publishes the assumptions", () => {
	it("declares the additive field on scenario tax, projection run, fi and compare", async () => {
		for (const command of ["scenario tax", "projection run", "fi", "projection compare"]) {
			const res = await capture(["schema", ...command.split(" "), "--json"])
			expect(res.code).toBe(0)
			expect(res.out).toContain('"assumptions"')
			expect(res.out).toContain("not yet confirmed")
		}
	})
})
