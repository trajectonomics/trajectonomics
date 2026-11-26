import { describe, expect, test } from "bun:test"
import { trialBalanceNote } from "./trial-balance"

describe("trialBalanceNote", () => {
	test("says the columns balance and were compared exactly, though the totals are past the safe range", () => {
		expect(trialBalanceNote(true)).toBe(
			"Debits equal credits, compared exactly; the totals exceed the safe range.",
		)
	})

	test("says the columns disagree when they do not balance, and never repeats the date above it", () => {
		const note = trialBalanceNote(false)
		expect(note).toBe(
			"Debits and credits disagree, compared exactly; the totals exceed the safe range.",
		)
		expect(note).not.toMatch(/\d{4}/)
	})
})
