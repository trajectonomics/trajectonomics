import { describe, expect, it } from "bun:test"
import { parseOptions } from "./cli"

describe("parseOptions", () => {
	it("defaults each agent session to 40 minutes", () => {
		expect(parseOptions(["--agent", "opencode"]).timeoutMs).toBe(40 * 60_000)
	})

	it("reads a fractional number of minutes as given", () => {
		expect(parseOptions(["--agent", "claude", "--timeout-minutes", "0.5"]).timeoutMs).toBe(30_000)
	})

	it("refuses a timeout that is not a number of minutes", () => {
		expect(() => parseOptions(["--agent", "claude", "--timeout-minutes", "soon"])).toThrow(
			"--timeout-minutes must be a positive number of minutes",
		)
	})

	it("refuses a timeout of zero or less", () => {
		expect(() => parseOptions(["--agent", "claude", "--timeout-minutes", "0"])).toThrow(
			"--timeout-minutes must be a positive number of minutes",
		)
		expect(() => parseOptions(["--agent", "claude", "--timeout-minutes=-5"])).toThrow(
			"--timeout-minutes must be a positive number of minutes",
		)
	})

	it("refuses a missing or unknown agent", () => {
		expect(() => parseOptions([])).toThrow("--agent must be one of")
		expect(() => parseOptions(["--agent", "gpt"])).toThrow("--agent must be one of")
	})
})
