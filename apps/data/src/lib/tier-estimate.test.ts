import { describe, expect, test } from "bun:test"
import { TIER_CATALOG } from "@trajectonomics/data-collector/tier-catalog"
import { factorLabel, figuresColumnMax, type TierFigures, tierFigures } from "./tier-estimate"
import type { MeasuredTier, Peak } from "./types"

const CLAUDE = TIER_CATALOG.claude
const CURSOR = TIER_CATALOG.cursor
const OPENCODE = TIER_CATALOG["opencode-go"]

function peak(tokens: number): Peak {
	return { tokens, fromDay: "2026-11-24" }
}

function measured(
	tier: string | null,
	fiveHours: number | null,
	sevenDays: number | null,
	thirtyDays: number | null,
): MeasuredTier {
	return {
		tier,
		fiveHours: fiveHours === null ? null : peak(fiveHours),
		sevenDays: sevenDays === null ? null : peak(sevenDays),
		thirtyDays: thirtyDays === null ? null : peak(thirtyDays),
	}
}

function plan(tier: string | null, entry: MeasuredTier) {
	return {
		tier,
		fiveHours: entry.fiveHours,
		sevenDays: entry.sevenDays,
		thirtyDays: entry.thirtyDays,
	}
}

describe("tierFigures", () => {
	test("shows the measured figures when we measured the picked tier", () => {
		const max = measured("Max", 50, 500, 5_000)
		const figures = tierFigures(plan("Max", max), "Max", [max], CLAUDE)
		expect(figures.kind).toBe("measured")
		expect(figures.kind === "measured" ? figures.cells.fiveHours : null).toEqual({
			kind: "measured",
			peak: peak(50),
		})
	})

	test("keeps the higher floor in each window when a tier was barely measured", () => {
		const max = measured("Max", 50, 500, 5_000)
		const pro = measured("Pro", 3, 300, 30)
		const figures = tierFigures(plan("Max", max), "Pro", [max, pro], CLAUDE)
		expect(figures.kind).toBe("estimated")
		if (figures.kind !== "estimated") return
		expect(figures.cells.fiveHours).toEqual({
			kind: "estimated",
			tokens: 10,
			factor: 0.2,
			fromTier: "Max",
		})
		expect(figures.cells.sevenDays).toEqual({ kind: "measured", peak: peak(300) })
		expect(figures.cells.thirtyDays).toEqual({
			kind: "estimated",
			tokens: 1_000,
			factor: 0.2,
			fromTier: "Max",
		})
	})

	test("stays measured when every measured floor is at least the estimate", () => {
		const max = measured("Max", 50, 500, 5_000)
		const pro = measured("Pro", 10, 100, 1_000)
		expect(tierFigures(plan("Max", max), "Pro", [max, pro], CLAUDE).kind).toBe("measured")
	})

	test("estimates Pro from Max by dividing by five", () => {
		const max = measured("Max", 50, 500, 5_000)
		const figures = tierFigures(plan("Max", max), "Pro", [max], CLAUDE)
		expect(figures).toEqual({
			kind: "estimated",
			tier: "Pro",
			fromTier: "Max",
			cells: {
				fiveHours: { kind: "estimated", tokens: 10, factor: 0.2, fromTier: "Max" },
				sevenDays: { kind: "estimated", tokens: 100, factor: 0.2, fromTier: "Max" },
				thirtyDays: { kind: "estimated", tokens: 1_000, factor: 0.2, fromTier: "Max" },
			},
		})
	})

	test("doubles the weekly figure for Ultra and leaves its five-hour window unstated", () => {
		const max = measured("Max", 50, 500, 5_000)
		const figures = tierFigures(plan("Max", max), "Ultra", [max], CLAUDE)
		expect(figures).toEqual({
			kind: "estimated",
			tier: "Ultra",
			fromTier: "Max",
			cells: {
				fiveHours: { kind: "not-stated" },
				sevenDays: { kind: "estimated", tokens: 1_000, factor: 2, fromTier: "Max" },
				thirtyDays: { kind: "estimated", tokens: 10_000, factor: 2, fromTier: "Max" },
			},
		})
	})

	test("estimates Cursor's Plus from Premium by dividing by four", () => {
		const premium = measured("Premium", null, 400, 4_000)
		const figures = tierFigures(plan("Premium", premium), "Plus", [premium], CURSOR)
		expect(figures).toEqual({
			kind: "estimated",
			tier: "Plus",
			fromTier: "Premium",
			cells: {
				fiveHours: { kind: "not-stated" },
				sevenDays: { kind: "estimated", tokens: 100, factor: 0.25, fromTier: "Premium" },
				thirtyDays: { kind: "estimated", tokens: 1_000, factor: 0.25, fromTier: "Premium" },
			},
		})
	})

	test("answers unknown when the picked tier states no multiplier", () => {
		const go = measured("Go", 20, 200, 2_000)
		expect(tierFigures(plan("Go", go), "Go Plus", [go], OPENCODE)).toEqual({
			kind: "unknown",
			tier: "Go Plus",
		})
	})

	test("shows the measured figures of a plan with no catalogue", () => {
		const pro = measured("Pro", null, 900, 9_000)
		const figures = tierFigures(plan("Pro", pro), "Pro", [pro], undefined)
		expect(figures.kind).toBe("measured")
		expect(figures.kind === "measured" ? figures.cells.sevenDays : null).toEqual({
			kind: "measured",
			peak: peak(900),
		})
	})

	test("scales from the measured tier with the largest week when the current one is not measured", () => {
		const max = measured("Max", 50, 500, 5_000)
		const figures = tierFigures(plan(null, max), "Pro", [max], CLAUDE)
		expect(figures.kind).toBe("estimated")
		expect(figures.kind === "estimated" ? figures.fromTier : null).toBe("Max")
	})
})

describe("the estimate's bars and tag", () => {
	const max = measured("Max", 50, 500, 5_000)
	const figures = tierFigures(plan("Max", max), "Pro", [max], CLAUDE)
	const rows: TierFigures[] = [figures, tierFigures(plan("Max", max), "Max", [max], CLAUDE)]

	test("measures every bar against the largest visible figure", () => {
		expect(figuresColumnMax([figures], "fiveHours")).toBe(10)
		expect(figuresColumnMax(rows, "fiveHours")).toBe(50)
	})

	test("writes a whole factor as a multiplication or a division", () => {
		expect(factorLabel(2)).toBe("×2")
		expect(factorLabel(0.2)).toBe("÷5")
		expect(factorLabel(0.25)).toBe("÷4")
		expect(factorLabel(3.75)).toBe("×3.75")
	})
})
