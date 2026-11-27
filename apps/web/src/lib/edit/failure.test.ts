import { describe, expect, test } from "bun:test"
import { isCliError } from "./failure"

describe("an Edit's error", () => {
	test("the CLI's own code is the CLI's text", () => {
		expect(isCliError({ code: "invalid_input" })).toBe(true)
	})

	test("the server's own refusals are not", () => {
		for (const code of [
			"edit_running",
			"bad_token",
			"not_ready",
			"scenario_name_taken",
			"contract_mismatch",
			"unparsed_error",
			"traj_unavailable",
		]) {
			expect(isCliError({ code })).toBe(false)
		}
	})

	test("a taken name is the CLI's only when the CLI names its field", () => {
		expect(isCliError({ code: "scenario_name_taken", path: "name" })).toBe(true)
	})

	test("no error is no CLI text", () => {
		expect(isCliError(null)).toBe(false)
	})
})
