import { describe, expect, it } from "bun:test"
import { thb } from "../../core/money"
import { runThaiCorpusCase } from "./corpus-harness"

// Transcribed corpus for separate filing (s.57 sexies para 1) when each spouse claims the same two
// children in full. Hand-computed from the statute, not run through an external calculator here:
// the 30,000 per child on each Return is likely (about 90%) and unconfirmed, so confirm it with RD
// (1161) or a recognised filing calculator before relying on it (research/separate-filing.md, note 1).
describe("corpus: a couple filing separately, each claiming both children in full", () => {
	// documented: s.47(1)(ก) 60,000 personal and s.47(1)(ค)(1) 30,000 per child, claimed by each
	// spouse with income and not halved (the halving rule, s.57 quinque para 2(2), is repealed).
	// Both children were born before 2018, so no second-child bonus applies. No spouse allowance.
	const children = [{ birthYear: 2014 }, { birthYear: 2016 }]

	it("taxes the first spouse's own 900,000 salary", () => {
		// expense: min(50% x 900,000, 100,000) = 100,000 (s.42 bis)
		// allowances: 60,000 personal + 2 x 30,000 children = 120,000
		// net taxable: 900,000 - 100,000 - 120,000 = 680,000
		// tax: 150,000-300,000 150,000 x 5% = 7,500; 300,000-500,000 200,000 x 10% = 20,000;
		//      500,000-680,000 180,000 x 15% = 27,000; total 54,500
		const res = runThaiCorpusCase({
			income: { section40_1: 900_000 },
			filingStatus: "married_separate",
			allowances: { children },
		})
		expect(res.breakdown.allowances.spouse.allowed).toBe(0)
		expect(res.breakdown.allowances.children.allowed).toBe(60_000)
		expect(res.breakdown.expenseDeductions.total).toBe(100_000)
		expect(res.breakdown.netTaxableIncome).toBe(680_000)
		expect(res.totalTax).toBe(thb(54_500))
	})

	it("taxes the second spouse's own 600,000 salary, claiming the same two children", () => {
		// expense: min(50% x 600,000, 100,000) = 100,000 (s.42 bis)
		// allowances: 60,000 personal + 2 x 30,000 children = 120,000
		// net taxable: 600,000 - 100,000 - 120,000 = 380,000
		// tax: 150,000-300,000 150,000 x 5% = 7,500; 300,000-380,000 80,000 x 10% = 8,000; total 15,500
		const res = runThaiCorpusCase({
			income: { section40_1: 600_000 },
			filingStatus: "married_separate",
			allowances: { children },
		})
		expect(res.breakdown.allowances.children.allowed).toBe(60_000)
		expect(res.breakdown.netTaxableIncome).toBe(380_000)
		expect(res.totalTax).toBe(thb(15_500))
	})
})
