import { describe, expect, it } from "bun:test"
import { resolve } from "node:path"
import { parseOptions, resultsPath } from "./cli"

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

describe("resultsPath", () => {
	it("defaults to <release>-<agent>.md in the results directory", () => {
		const options = parseOptions(["--agent", "claude"])
		expect(options.out).toBeUndefined()
		expect(resultsPath(options, "0.7.0", "/r")).toBe("/r/0.7.0-claude.md")
	})

	it("writes to --out instead, so parallel processes do not clobber one file", () => {
		const nok = parseOptions(["--agent", "claude", "--persona", "nok", "--out", "/o/nok.md"])
		const ploy = parseOptions(["--agent", "claude", "--persona", "ploy", "--out=/o/ploy.md"])
		expect(resultsPath(nok, "0.7.0", "/r")).toBe("/o/nok.md")
		expect(resultsPath(ploy, "0.7.0", "/r")).toBe("/o/ploy.md")
	})

	it("resolves a relative --out against the working directory", () => {
		const options = parseOptions(["--agent", "claude", "--out", "rows/nok.md"])
		expect(resultsPath(options, "0.7.0", "/r")).toBe(resolve("rows/nok.md"))
	})

	it("refuses an empty --out", () => {
		const options = parseOptions(["--agent", "claude", "--out", ""])
		expect(() => resultsPath(options, "0.7.0", "/r")).toThrow("--out needs a file path")
	})
})
