import { describe, expect, test } from "bun:test"
import { carryInFor } from "./carry-in"

describe("the Carry-in records a read takes", () => {
	const records = [
		{ scenario: "base", levy: "th-2026-pit", periodStart: "2026-01-01" },
		{ scenario: "retire-early", levy: "th-2026-pit", periodStart: "2026-01-01" },
		{ scenario: "other", levy: "th-2026-pit", periodStart: "2026-01-01" },
	]

	test("keeps only the records of the Scenarios the read prepares, in order", () => {
		expect(carryInFor(records, ["retire-early", "base"])).toEqual([records[0], records[1]])
	})

	test("drops a record that names no Scenario, or names one that is not a string", () => {
		expect(carryInFor([{ levy: "x" }, null, "base", { scenario: 3 }], ["base"])).toEqual([])
	})

	test("a read that prepares no Scenario takes no record", () => {
		expect(carryInFor(records, [])).toEqual([])
	})
})
