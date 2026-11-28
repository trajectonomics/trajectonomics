import { describe, expect, test } from "bun:test"
import { ageProblem } from "./stop"

describe("ageProblem", () => {
	test("takes whole years from 0 up to one before the life expectancy", () => {
		for (const text of ["0", "60", "89"]) expect(ageProblem(text, 90)).toBeNull()
	})

	test("asks for whole years when the text is not one", () => {
		for (const text of ["", "sixty", "60.5", "-1", "  "])
			expect(ageProblem(text, 90)).toBe("Enter the age in whole years.")
	})

	test("states the life expectancy in the number it asks the person to stay under", () => {
		expect(ageProblem("90", 90)).toBe("Choose an age before your life expectancy (90).")
		expect(ageProblem("95", 90)).toBe("Choose an age before your life expectancy (90).")
		expect(ageProblem("95", 85)).toBe("Choose an age before your life expectancy (85).")
	})
})
