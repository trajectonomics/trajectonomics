import { describe, expect, test } from "bun:test"
import { baselineChance, baselineRun } from "./baseline"
import { cashflowTriples } from "./cashflow"
import { chanceTriple } from "./chance"
import { changeSentence, countChange, moneyChange } from "./change"
import { whatIfSeries } from "./chart"
import { figureOf, figureTriples } from "./figures"
import { DEMO, DEMO_COMPARE, demoLens, statedCompare } from "./fixtures.test-support"
import { overviewExtras } from "./overview"
import { taxYearTriples } from "./tax"
import { ALL_YEAR_FIGURES, yearLabels, yearRows } from "./years"

describe("a change is a figure the CLI stated, with a sign and words", () => {
	test("a money change keeps the CLI's sign and says higher or lower", () => {
		expect(moneyChange("5000.00", ["higher", "lower"], "why")).toEqual({
			kind: "money",
			amount: "5000.00",
			words: "higher",
		})
		expect(moneyChange("-1.50", ["higher", "lower"], "why")).toEqual({
			kind: "money",
			amount: "-1.50",
			words: "lower",
		})
	})

	test("a zero is the same, and a null is no change with its reason: nothing is computed", () => {
		expect(moneyChange("0.00", ["more", "less"], "why")).toEqual({ kind: "same" })
		expect(moneyChange(null, ["more", "less"], "the periods differ")).toEqual({
			kind: "none",
			reason: "the periods differ",
		})
		expect(countChange(null, "month", ["earlier", "later"], "no FI")).toEqual({
			kind: "none",
			reason: "no FI",
		})
	})

	test("a count of months reads as words: negative is earlier, positive later", () => {
		const earlier = countChange(-3, "month", ["earlier", "later"], "")
		expect(earlier).toEqual({ kind: "count", text: "−3 months", words: "earlier" })
		expect(changeSentence(earlier)).toBe("−3 months, earlier")
		expect(countChange(1, "month", ["earlier", "later"], "")).toEqual({
			kind: "count",
			text: "+1 month",
			words: "later",
		})
	})
})

describe("the headline figures", () => {
	test("a session with a change: each figure has the what-if, the baseline and the CLI's change", () => {
		const triples = figureTriples(statedCompare())
		const fi = triples.find((triple) => triple.key === "fi")
		expect(fi?.change).toEqual({ kind: "count", text: "−3 months", words: "earlier" })
		expect(fi?.baseline.value).toEqual({ kind: "text", text: "Jun 2044" })
		expect(fi?.whatIf.value).toEqual({ kind: "text", text: "Not reachable" })
		expect(figureOf(statedCompare(), "final-nominal")?.change).toEqual({
			kind: "money",
			amount: "1200.00",
			words: "higher",
		})
		expect(figureOf(statedCompare(), "run-out")?.change).toEqual({
			kind: "count",
			text: "+2 years",
			words: "later",
		})
	})

	test("a compare with null deltas shows no change, never a computed one", () => {
		const triples = figureTriples(DEMO_COMPARE)
		for (const key of ["fi", "final-nominal", "final-real", "run-out"]) {
			expect(triples.find((triple) => triple.key === key)?.change.kind).toBe("none")
		}
		expect(JSON.stringify(triples)).not.toContain("NaN")
	})
})

describe("the years", () => {
	test("each year's closing net worth has its CLI change, and a year with a null delta has none", () => {
		const rows = yearRows(statedCompare(), ["closingNetWorth"])
		expect(rows[0]?.figures[0]?.change).toEqual({
			kind: "money",
			amount: "5000.00",
			words: "higher",
		})
		expect(rows[0]?.figures[0]?.whatIf.value).toEqual({ kind: "money", amount: "1749616.72" })
		expect(rows[0]?.figures[0]?.baseline.value).toEqual({ kind: "money", amount: "1744616.72" })
		expect(rows[1]?.figures[0]?.change.kind).toBe("none")
	})

	test("the Levy change is the CLI's, and the Levy column shows only when a year has a Levy", () => {
		const rows = yearRows(statedCompare(), ["levy"])
		expect(rows[0]?.figures[0]?.change).toEqual({
			kind: "money",
			amount: "-1000.00",
			words: "less",
		})
		expect(yearLabels(rows)).toEqual(["Levy"])
		const without = yearRows(DEMO_COMPARE, ["levy"]).map((row) => ({ ...row, figures: [] }))
		expect(yearLabels(without)).toEqual([])
	})

	test("every figure of the annual table is offered, in column order", () => {
		const rows = yearRows(DEMO_COMPARE, ALL_YEAR_FIGURES)
		expect(yearLabels(rows)).toEqual([
			"Closing net worth",
			"Income",
			"Expense",
			"Contributions",
			"Interest",
			"Levy",
		])
	})
})

describe("the chance, tax and cash flow", () => {
	test("the chance is two values and no difference", () => {
		const lens = demoLens()
		const baseline = baselineChance(DEMO, "base")
		if (lens.chance === null || baseline === null) throw new Error("the Demo has chance reads")
		const triple = chanceTriple(lens.chance, baseline)
		expect(triple.sentence).toBe(`from ${triple.baseline} to ${triple.whatIf}`)
		expect(Object.keys(triple)).not.toContain("change")
		expect(chanceTriple(lens.chance, null).sentence).toBe(triple.whatIf)
	})

	test("each tax year has the what-if figure beside the baseline's and states no change", () => {
		const years = taxYearTriples(statedCompare())
		expect(years.length).toBeGreaterThan(0)
		for (const figure of years.flatMap((year) => year.figures)) {
			expect(figure.change.kind).toBe("none")
		}
		expect(years[0]?.figures.map((figure) => figure.label)).toEqual(["Due", "Prepaid", "Owed"])
	})

	test("a tax year only one side has reads no such year on the other", () => {
		const compare = structuredClone(DEMO_COMPARE)
		compare.sides.b.taxYears = []
		const first = taxYearTriples(compare)[0]
		expect(first?.figures[0]?.whatIf.value).toEqual({ kind: "text", text: "No such year" })
		expect(first?.figures[0]?.baseline.value.kind).toBe("money")
	})

	test("the Overview adds the chance and the first tax year", () => {
		const lens = demoLens(statedCompare())
		const extras = overviewExtras(lens, baselineChance(DEMO, "base"))
		expect(extras.chance?.whatIf).toMatch(/%$/)
		expect(extras.tax?.label).toContain("Tax owed for")
	})

	test("the cash flow totals of a year are the CLI's rows, with no change between them", () => {
		const lens = demoLens()
		const triples = cashflowTriples(lens.run ?? failing(), baselineRun(DEMO, "base"), 0)
		expect(triples.map((triple) => triple.label)).toContain("money in")
		for (const triple of triples) expect(triple.change.kind).toBe("none")
		const alone = cashflowTriples(lens.run ?? failing(), null, 0)
		expect(alone[0]?.baseline.value).toEqual({ kind: "text", text: "No such year" })
	})
})

describe("the chart", () => {
	test("draws the what-if solid over the baseline dashed, and names both", () => {
		const lens = demoLens()
		const series = whatIfSeries(lens.run ?? failing(), baselineRun(DEMO, "base"), "both")
		expect(series.map((entry) => entry.name)).toEqual([
			"What-if: Nominal net worth",
			"Baseline: Nominal net worth",
		])
		expect(series.map((entry) => entry.dashed === true)).toEqual([false, true])
	})

	test("with no baseline run it draws the what-if alone", () => {
		const lens = demoLens()
		expect(whatIfSeries(lens.run ?? failing(), null, "real")).toHaveLength(1)
	})
})

function failing(): never {
	throw new Error("the Demo has a run")
}
