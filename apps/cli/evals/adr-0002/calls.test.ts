import { describe, expect, it } from "bun:test"
import {
	commandPathOf,
	type FlagTable,
	flagsIn,
	flagsOfCall,
	inventedFlagsOf,
	parseCallLog,
} from "./calls"

const names = ["fi", "scenario apply", "scenario tax", "schema", "help", "help fi"]

describe("commandPathOf", () => {
	it("takes the longest command name the leading words spell", () => {
		expect(commandPathOf(["scenario", "tax", "base", "--tax", "th-2026"], names)).toBe(
			"scenario tax",
		)
		expect(commandPathOf(["fi", "--scenario", "base"], names)).toBe("fi")
	})

	it("stops at a flag that is not global, and returns the root when nothing matches", () => {
		expect(commandPathOf(["--json"], names)).toBe("")
		expect(commandPathOf(["scenario", "--as-of", "tax"], names)).toBe("")
	})

	it("skips a global flag before the command name", () => {
		const globals = new Set(["--json"])
		expect(commandPathOf(["--json", "fi", "--as-of", "2026-01-01"], names, globals)).toBe("fi")
	})

	it("skips a global flag inside a command path, as the CLI's own walk does", () => {
		const globals = new Set(["--json"])
		expect(commandPathOf(["scenario", "--json", "tax"], names, globals)).toBe("scenario tax")
	})
})

describe("flags", () => {
	it("reads flag names from help text, without values", () => {
		expect([...flagsIn("  --as-of <string>  The date\n  --json  print\n")].sort()).toEqual([
			"--as-of",
			"--json",
		])
	})

	it("reads the flags of a call, dropping =value and the bare --", () => {
		expect(flagsOfCall(["fi", "--as-of=2026-01-01", "--json", "--", "--set"])).toEqual([
			"--as-of",
			"--json",
			"--set",
		])
	})

	it("reports flags the command's help does not list", () => {
		const table: FlagTable = { fi: new Set(["--as-of", "--json"]), "": new Set(["--json"]) }
		expect(inventedFlagsOf(["fi", "--as-of", "2026-01-01", "--when", "x"], names, table)).toEqual([
			"--when",
		])
		expect(inventedFlagsOf(["--json"], names, table)).toEqual([])
	})

	it("does not report a global flag placed before the command name as invented", () => {
		const table: FlagTable = { fi: new Set(["--as-of"]), "": new Set(["--json"]) }
		expect(inventedFlagsOf(["--json", "fi", "--as-of", "2026-01-01"], names, table)).toEqual([])
		expect(inventedFlagsOf(["--json", "fi", "--when", "x"], names, table)).toEqual(["--when"])
	})
})

describe("parseCallLog", () => {
	it("parses one JSON call per line and skips blank lines", () => {
		const text = `${JSON.stringify({ argv: ["fi"], exitCode: 0, ms: 4 })}\n\n${JSON.stringify({ argv: ["x"], exitCode: 2, ms: 1 })}\n`
		expect(parseCallLog(text)).toEqual([
			{ argv: ["fi"], exitCode: 0, ms: 4 },
			{ argv: ["x"], exitCode: 2, ms: 1 },
		])
	})

	it("refuses a malformed line rather than skipping it", () => {
		expect(() => parseCallLog('{"argv":"fi","exitCode":0}')).toThrow()
		expect(() => parseCallLog('{"argv":["fi"]}')).toThrow()
	})
})
