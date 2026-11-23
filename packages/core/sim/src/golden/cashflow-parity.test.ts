import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { ProjectionOptions } from "../types"
import { ASSET_TRADE_PARITY_CASES } from "./asset-trade-cases"
import { identitySides, rollupMismatches } from "./cashflow-check"
import { CASHFLOW_PARITY_CASES } from "./cashflow-parity-cases"
import { CATEGORY_PARITY_CASES } from "./category-parity-cases"
import { PARITY_CASES } from "./parity-cases"
import { STATEMENT_PARITY_CASES } from "./statement-parity-cases"

const EVERY_CASE = [
	...PARITY_CASES,
	...STATEMENT_PARITY_CASES,
	...CATEGORY_PARITY_CASES,
	...CASHFLOW_PARITY_CASES,
	...ASSET_TRADE_PARITY_CASES,
]

describe("the cash-flow breakdown on every parity fixture", () => {
	it.each(EVERY_CASE.map((item) => [item.name, item] as const))(
		"%s: opt-in, every other figure unchanged, and the identity holds per roll-up",
		(_name, { fixture, projectOptions }) => {
			const { baseline, scenario, timeline } = fixture
			const { cashflowBreakdown: _option, ...base }: ProjectionOptions = projectOptions ?? {}
			const plain = project(baseline, scenario, timeline, base)
			const options: ProjectionOptions = { ...base, cashflowBreakdown: true }
			const withLines = project(baseline, scenario, timeline, options)
			if (!plain.ok || !withLines.ok) throw new Error("the parity fixture must project")
			expect("cashflow" in plain.projection).toBe(false)
			const { cashflow, ...rest } = withLines.projection
			expect(rest).toEqual(plain.projection)
			expect(cashflow).toHaveLength(plain.projection.annual.length)
			cashflow?.forEach((line, index) => {
				const annual = plain.projection.annual[index]!
				const sides = identitySides(line)
				expect(Number.isInteger(sides.moneyIn)).toBe(true)
				expect(sides.moneyIn).toBe(sides.moneyOut)
				expect(line.index).toBe(annual.index)
				expect([line.from, line.to]).toEqual([annual.from, annual.to])
				expect(rollupMismatches(annual, line)).toEqual([])
			})
		},
	)
})
