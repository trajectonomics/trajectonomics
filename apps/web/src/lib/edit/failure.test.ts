import { describe, expect, test } from "bun:test"
import { isCliError } from "./failure"

describe("an Edit's error", () => {
	test("the CLI's own code is the CLI's text", () => {
		expect(
			isCliError({
				code: "invalid_input",
				exitCode: 2,
				message: "WITHDRAW_FLOOR_ORDER: a floor after a plain entry",
			}),
		).toBe(true)
	})

	test("the server's own refusals are not", () => {
		for (const code of ["edit_running", "bad_token", "not_ready", "scenario_name_taken"]) {
			expect(isCliError({ code, exitCode: 1, message: "The Dashboard's own words." })).toBe(false)
		}
	})

	test("a taken name is the CLI's only when the CLI names its field", () => {
		expect(
			isCliError({
				code: "scenario_name_taken",
				exitCode: 5,
				message: "A scenario with this name already exists.",
				path: "name",
			}),
		).toBe(true)
	})

	test("no error is no CLI text", () => {
		expect(isCliError(null)).toBe(false)
	})
})
