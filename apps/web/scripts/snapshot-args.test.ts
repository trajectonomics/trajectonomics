import { describe, expect, test } from "bun:test"
import { parseSnapshotArgs } from "./snapshot-args"

describe("the snapshot command line", () => {
	test("reads the dates, the repeated flags and the paths into the Plan's input", () => {
		const result = parseSnapshotArgs([
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--scenario",
			"base",
			"--scenario",
			"retire-early",
			"--birth-date",
			"1990-05-15",
			"--age",
			"45",
			"--age",
			"60",
			"--monthly",
			"--traj",
			"/bin/traj",
			"--out",
			"x.json",
		])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.options.input).toEqual({
			asOf: "2026-10-31",
			horizon: "2060-12-31",
			scenarios: ["base", "retire-early"],
			compare: null,
			birthDate: "1990-05-15",
			ages: [45, 60],
			monthly: true,
			carryIn: false,
		})
		expect(result.options.traj).toBe("/bin/traj")
		expect(result.options.out).toBe("x.json")
	})

	test("--compare takes exactly two Scenario names, and --flag=value is read too", () => {
		const result = parseSnapshotArgs(["--compare", "base", "retire-early", "--as-of=2026-10-31"])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.options.input.compare).toEqual({ a: "base", b: "retire-early" })
		expect(result.options.input.asOf).toBe("2026-10-31")
	})

	test("a compare with one name, a flag with no value, and an unknown flag are refused", () => {
		expect(parseSnapshotArgs(["--compare", "base"]).ok).toBe(false)
		expect(parseSnapshotArgs(["--as-of"]).ok).toBe(false)
		expect(parseSnapshotArgs(["--nope", "1"]).ok).toBe(false)
	})

	test("a value keeps every = after the first, and flags without a value refuse one", () => {
		const result = parseSnapshotArgs(["--out=a=b.json"])
		expect(result.ok && result.options.out).toBe("a=b.json")
		expect(parseSnapshotArgs(["--monthly=false"]).ok).toBe(false)
		expect(parseSnapshotArgs(["--compare=base", "x"]).ok).toBe(false)
	})

	test("an age is a whole number of years", () => {
		expect(parseSnapshotArgs(["--age", ""]).ok).toBe(false)
		expect(parseSnapshotArgs(["--age", "4.5"]).ok).toBe(false)
		expect(parseSnapshotArgs(["--age", "45"]).ok).toBe(true)
	})

	test("--carry-in names a file and sets the Carry-in flag", () => {
		const result = parseSnapshotArgs(["--carry-in", "carry.json"])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.options.carryIn).toBe("carry.json")
		expect(result.options.input.carryIn).toBe(true)
	})
})
