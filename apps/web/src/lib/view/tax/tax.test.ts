import { describe, expect, test } from "bun:test"
import type { TaxYear } from "../../contract"
import { projectionRun } from "../compare/projection.test-support"
import { assumptionLines } from "./assumptions"
import { addLevyCommand, taxBody } from "./body"
import { carryInRows } from "./carry-in"
import { taxStatusWords } from "./status"
import { taxChart } from "./tax-chart"
import { isRefund, taxHeadline, taxRows } from "./tax-rows"

function year(over: Partial<TaxYear> = {}): TaxYear {
	return {
		levy: "th-2026-pit",
		from: "2026-01-01",
		to: "2026-12-31",
		settlementDate: "2027-03-31",
		due: "89000.00",
		prepaid: "0.00",
		owed: "89000.00",
		settled: true,
		partial: false,
		assumptions: [],
		...over,
	}
}

describe("tax body", () => {
	test("a Scenario with no tax years has no Levy, even when its tax says applied", () => {
		expect(taxBody(projectionRun({ taxYears: [] }))).toEqual({ kind: "no-levy" })
	})

	test("a Scenario whose tax is not applied has no Levy, even with years in view", () => {
		expect(taxBody(projectionRun({ tax: "not_applied", taxYears: [year()] }))).toEqual({
			kind: "no-levy",
		})
	})

	test("a Scenario with a Levy shows its first year as the headline and one row per year", () => {
		const body = taxBody(projectionRun({ taxYears: [year(), year({ from: "2027-01-01" })] }))
		if (body.kind !== "levies") throw new Error("expected levies")
		expect(body.headline).toEqual({
			levy: "th-2026-pit",
			owed: "89000.00",
			refund: false,
			period: "1 Jan 2026 to 31 Dec 2026",
			settles: "31 Mar 2027",
		})
		expect(body.rows).toHaveLength(2)
		expect(body.chart).toBeNull()
	})

	test("the command that adds Thailand's Levy names the Scenario", () => {
		expect(addLevyCommand("base")).toBe("traj scenario tax base --tax th-2026")
	})
})

describe("refunds", () => {
	test("a negative owed is a refund, and its figure keeps its sign", () => {
		const headline = taxHeadline([year({ owed: "-12000.00", due: "0.00", prepaid: "12000.00" })])
		expect(headline?.refund).toBe(true)
		expect(headline?.owed).toBe("-12000.00")
	})

	test("zero, a positive figure and a negative zero are not refunds", () => {
		expect(isRefund("0.00")).toBe(false)
		expect(isRefund("-0.00")).toBe(false)
		expect(isRefund("89000.00")).toBe(false)
	})
})

describe("tax rows", () => {
	test("settled and partial come from the CLI's flags, and the period and settlement are dates", () => {
		const [settled, partial] = taxRows([
			year(),
			year({
				from: "2060-01-01",
				to: "2060-12-31",
				settlementDate: "2061-03-31",
				settled: false,
				partial: true,
			}),
		])
		expect(settled).toMatchObject({ settled: true, partial: false, refund: false })
		expect(partial).toMatchObject({
			settled: false,
			partial: true,
			period: "1 Jan 2060 to 31 Dec 2060",
			settles: "31 Mar 2061",
		})
	})
})

describe("tax chart", () => {
	test("is not drawn for fewer than three years", () => {
		expect(taxChart([year(), year({ from: "2027-01-01" })])).toBeNull()
	})

	test("draws due and owed, with owed dashed, once there are three years", () => {
		const years = [
			year({ due: "10.00", owed: "10.00" }),
			year({ from: "2027-01-01", due: "20.00", owed: "-5.00" }),
			year({ from: "2028-01-01", due: "30.00", owed: "30.00" }),
		]
		const series = taxChart(years)
		expect(series?.map((line) => line.name)).toEqual(["Due", "Owed"])
		expect(series?.[1]?.dashed).toBe(true)
		expect(series?.[1]?.points.map((point) => point.y)).toEqual([10, -5, 30])
	})
})

describe("carry-in and status", () => {
	test("a Carry-in record is echoed with its period's start, its source and its tallies", () => {
		const [row] = carryInRows([
			{
				levy: "th-2026-pit",
				periodStart: "2026-01-01",
				tallies: [{ label: "income.section40_1", basis: "gross", amount: "850000.00" }],
				prepaid: "0.00",
				source: "flag",
			},
		])
		expect(row).toMatchObject({ periodStart: "1 Jan 2026", source: "flag", prepaid: "0.00" })
		expect(row?.tallies[0]).toMatchObject({ label: "income.section40_1", basis: "gross" })
	})

	test("the tax status is said in words", () => {
		expect(taxStatusWords("applied")).toBe("Tax applied")
		expect(taxStatusWords("not_applied")).toBe("Tax not applied")
		expect(taxStatusWords("mixed")).toBe("Tax mixed across the two plans")
	})
})

describe("assumption lines", () => {
	const gpf = {
		path: "allowances.retirementCluster.gpf.maxRate",
		value: 0.3,
		status: "reported" as const,
		note: "Government pension fund limit, share of wages.",
	}

	test("lists each figure once across the years, in the CLI's order", () => {
		const lines = assumptionLines([
			year({ assumptions: [gpf] }),
			year({ from: "2027-01-01", assumptions: [gpf, { ...gpf, path: "a.b", value: [1, 2] }] }),
		])
		expect(lines.map((line) => line.path)).toEqual([gpf.path, "a.b"])
		expect(lines[0]?.text).toBe(
			"Government pension fund limit, share of wages. Used 0.3; reported.",
		)
		expect(lines[1]?.text).toContain("Used 1, 2;")
	})

	test("is empty when no year used an unconfirmed figure", () => {
		expect(assumptionLines([year(), year()])).toEqual([])
	})
})
