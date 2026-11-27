import { describe, expect, test } from "bun:test"
import { plans } from "@trajectonomics/data-collector/plans"
import { colourLiterals } from "./colour-literals"
import { planColour } from "./plan-colour"

const FOREGROUND = "var(--ds-color-foreground)"

describe("a plan's colour", () => {
	test("uses the published mark colour", () => {
		expect(planColour("claude")).toBe("#D97757")
		expect(planColour("antigravity")).toBe("#8E75B2")
		expect(planColour("meta")).toBe("#0467DF")
		expect(planColour("mistral")).toBe("#FA520F")
	})

	test("keeps a black mark on the theme foreground", () => {
		expect(planColour("opencode-go")).toBe(FOREGROUND)
		expect(planColour("opencode-free")).toBe(FOREGROUND)
		expect(planColour("cursor")).toBe(FOREGROUND)
		expect(planColour("command-code")).toBe(FOREGROUND)
		expect(colourLiterals(planColour("cursor"))).toEqual([])
	})

	test("covers every plan in the table", () => {
		for (const plan of plans) expect(planColour(plan.id).length).toBeGreaterThan(0)
	})

	test("uses the theme foreground for a plan it does not know", () => {
		expect(planColour("a-plan-we-do-not-know")).toBe(FOREGROUND)
		expect(colourLiterals(planColour("a-plan-we-do-not-know"))).toEqual([])
	})
})
