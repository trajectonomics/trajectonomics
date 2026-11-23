import { describe, expect, test } from "bun:test"
import { demoPlan } from "./fixtures.test-support"
import { estateFieldOfRefusal, estateShown, layoutOf } from "./refusal"
import { lineWords } from "./words"

const base = demoPlan("base")

describe("a refusal lands on the field its path names, in either form", () => {
	const layout = layoutOf(base.doc.estate ?? null)
	const refusal = (path: string) => ({ code: "invalid_input", exitCode: 2, message: "no", path })

	test("the core's index form and the decimal conversion's id form name the same field", () => {
		expect(estateFieldOfRefusal(refusal("document.estate.costs.0.bps"), layout)).toBe(
			"costs.0.share",
		)
		expect(estateFieldOfRefusal(refusal("document.estate.costs.settlement.bps"), layout)).toBe(
			"costs.0.share",
		)
		expect(estateFieldOfRefusal(refusal("estate.costs.court-and-legal-fees.amount"), layout)).toBe(
			"costs.1.amount",
		)
		expect(estateFieldOfRefusal(refusal("document.estate.gifts.0.rounding"), layout)).toBe(
			"gifts.0.rounding",
		)
	})

	test("a base, its accounts, a growth and its rate, an id and a line with the wrong keys each have a field", () => {
		const at = (path: string) => estateFieldOfRefusal(refusal(path), layout)
		expect(at("document.estate.costs.0.of")).toBe("costs.0.of")
		expect(at("document.estate.costs.0.of.accounts.0")).toBe("costs.0.accounts")
		expect(at("document.estate.costs.1.growth")).toBe("costs.1.growth")
		expect(at("document.estate.costs.1.growth.bps")).toBe("costs.1.rate")
		expect(at("document.estate.costs.1.id")).toBe("costs.1.name")
		expect(at("document.estate.gifts.0.amount")).toBe("gifts.0.amount")
		expect(at("document.estate.costs.0.nothing")).toBe("costs.0.how")
	})

	test("a path that names no line of the form is shown for the whole form, in the CLI's words", () => {
		expect(estateFieldOfRefusal(refusal("document.estate.costs.9.bps"), layout)).toBeNull()
		expect(estateFieldOfRefusal(refusal("document.flows.0.amount"), layout)).toBeNull()
		expect(estateFieldOfRefusal(null, layout)).toBeNull()
		const shown = estateShown(
			{},
			refusal("document.estate.costs.9.bps"),
			"Not in the plan.",
			layout,
		)
		expect(shown.general).toBe("Not in the plan.")
		const field = estateShown({}, refusal("document.estate.costs.0.bps"), "Too much.", layout)
		expect(field.at("costs.0.share")).toBe("Too much.")
		expect(field.general).toBeUndefined()
	})
})

describe("the lines in words", () => {
	test("a share says what it is of, a fixed amount how it grows; no figure is worked out", () => {
		const name = (id: string) => (id === "condo" ? "Condo" : id)
		const lines = base.doc.estate
		expect(lineWords(lines?.costs?.[0] ?? { id: "x" }, name).words).toBe(
			"1.00% of everything owned, rounded to the nearest, a half up",
		)
		expect(lineWords(lines?.costs?.[1] ?? { id: "x" }, name)).toEqual({
			amount: "50000.00",
			words: "in the money of the plan's start, keeping pace with inflation",
		})
		expect(lineWords(lines?.gifts?.[0] ?? { id: "x" }, name).words).toBe(
			"5.00% of what is left after debts and costs, rounded to the nearest, a half up",
		)
		expect(
			lineWords(
				{ id: "s", of: { accounts: ["condo", "bank"] }, bps: "3.00", rounding: "floor" },
				name,
			).words,
		).toBe("3.00% of Condo, bank, rounded down")
		expect(lineWords({ id: "g", amount: "1.00", growth: { bps: 250 } }, name).words).toContain(
			"growing 2.50% a year",
		)
	})
})
