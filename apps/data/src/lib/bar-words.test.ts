import { describe, expect, test } from "bun:test"
import { barFigureText, barTip, barValueText } from "./bar-words"
import type { PlanBar } from "./plan-bars"

const bar = (unit: PlanBar["unit"], tokens: number | null): PlanBar => ({
	plan: "claude",
	planName: "Claude",
	tier: "Max",
	unit,
	kind: "estimate",
	tokens,
	low: null,
	high: null,
	rough: false,
	derived: false,
	collecting: null,
})

describe("bar words in each unit", () => {
	test("a dollar bar's label is compact and its table cell exact", () => {
		expect(barFigureText(bar("usd", 1239.88))).toBe("$1.2K")
		expect(barValueText(bar("usd", 1239.88))).toBe("$1,239.88")
	})

	test("the hover tip names the unit", () => {
		expect(barTip(bar("usd", 46.81))).toStartWith("Claude: $46.81 at API prices.")
		expect(barTip(bar("processed", 5_000_000))).toStartWith("Claude: 5,000,000 tokens with cache.")
		expect(barTip(bar("tokens", 5_000_000))).toStartWith("Claude: 5,000,000 tokens.")
	})

	test("a plan with no figure in the unit reads a dash", () => {
		expect(barFigureText(bar("usd", null))).toBe("–")
	})
})
