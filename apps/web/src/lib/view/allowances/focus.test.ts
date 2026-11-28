import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, ProjectionAllowances } from "../../contract"
import { personNames } from "../item-names"
import { inYear } from "./fixtures.test-support"
import { allowancesFocusView } from "./focus"

/** One Filer's Returns from the golden, its Levy and each label suffixed as a separate filing writes them. */
function forFiler(data: ProjectionAllowances, filer: string): ProjectionAllowances {
	const suffixed = (label: string) => `${label}@${filer}`
	return {
		...data,
		labels: data.labels.map(suffixed),
		taxYears: data.taxYears.map((year) => ({ ...year, levy: `${year.levy}@${filer}`, filer })),
		allowances: data.allowances.map((row) => ({
			...row,
			levy: `${row.levy}@${filer}`,
			label: suffixed(row.label),
			filer,
		})),
	}
}

/** The golden as a separate filing's read: two Returns in the As-of's year, the second saving what it is given. */
function separate(partnerSaving: string): ProjectionAllowances {
	const me = forFiler(inYear("2026-10-31"), "me")
	const partner = forFiler(inYear("2026-10-31"), "partner")
	partner.taxYears[0] = { ...partner.taxYears[0]!, saving: partnerSaving }
	return {
		...me,
		labels: [...me.labels, ...partner.labels],
		taxYears: [...me.taxYears, ...partner.taxYears],
		allowances: [...me.allowances, ...partner.allowances],
	}
}

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

describe("allowancesFocusView", () => {
	test("states the saving and the year, with one bar per allowance that has room", () => {
		const view = allowancesFocusView(inYear("2026-10-31"), false)
		if (view === null) throw new Error("the golden has a year with room")
		expect(view.label).toBe(
			"How much tax could you still save? 28.1k THB. By taking more of your allowances in 2026.",
		)
		expect(view.period).toBe("2026")
		expect(view.currency).toBe("THB")
		expect(view.groups).toHaveLength(1)
		expect(view.groups[0]?.name).toBeNull()
		expect(view.groups[0]?.bars.map((bar) => bar.name)).toEqual(["RMF", "ThaiESG"])
		for (const bar of view.groups[0]?.bars ?? []) expect(bar.taken + bar.left).toBeCloseTo(1, 10)
	})

	test("scales every bar against the widest planned plus extra, never its own room", () => {
		const data = inYear("2026-10-31")
		const row = data.allowances[0]
		if (row === undefined) throw new Error("the golden has a row")
		row.planned = "81000.00"
		row.extra = "243000.00"
		const bars = allowancesFocusView(data, false)?.groups[0]?.bars ?? []
		expect(bars[0]?.width).toBe(1)
		expect(bars[1]?.width).toBeCloseTo(189000 / 324000, 10)
		expect(bars[0]?.taken).toBeCloseTo(0.25, 10)
		expect(bars[0]?.left).toBeCloseTo(0.75, 10)
	})

	test("skips a row whose planned and extra are both zero", () => {
		const data = inYear("2026-10-31")
		const row = data.allowances[1]
		if (row === undefined) throw new Error("the golden has two rows")
		row.planned = "0.00"
		row.extra = "0.00"
		expect(allowancesFocusView(data, false)?.groups[0]?.bars).toHaveLength(1)
	})

	test("builds one group per Return of a separate filing, each named and never summed", () => {
		const view = allowancesFocusView(separate("4600.00"), false, personNames(HOUSEHOLD))
		if (view === null) throw new Error("the separate read has room")
		expect(
			view.groups.map((group) => (typeof group.name === "string" ? group.name : group.name?.text)),
		).toEqual(["You", "Your partner"])
		expect(view.groups.map((group) => group.saving)).toEqual(["28100.00", "4600.00"])
		expect(view.label).toContain("You: 28.1k THB.")
		expect(view.label).toContain("Your partner: 4.6k THB.")
		expect(view.label).not.toContain("32.7k")
		expect(view.groups.map((group) => group.bars.length)).toEqual([2, 2])
	})

	test("names every Return and hides every saving with Hide amounts on", () => {
		expect(allowancesFocusView(inYear("2026-10-31"), true)?.label).toBe(
			"How much tax could you still save? The amount is hidden. By taking more of your allowances in 2026.",
		)
		const separateView = allowancesFocusView(separate("4600.00"), true, personNames(HOUSEHOLD))
		expect(separateView?.label).toBe(
			"How much tax could you still save? You: the amount is hidden. Your partner: the amount is hidden. By taking more of your allowances in 2026.",
		)
	})

	test("has no answer when no year holds the As-of", () => {
		expect(allowancesFocusView(inYear("2031-01-01"), false)).toBeNull()
	})
})
