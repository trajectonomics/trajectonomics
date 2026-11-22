import { describe, expect, test } from "bun:test"
import { projectionRunFixture, SCENARIO } from "./fixtures.test-support"
import { shortHash, statementOf } from "./statement"

describe("statementOf", () => {
	test("names the tax status in words for each of the three values", () => {
		expect(statementOf(projectionRunFixture({ tax: "applied" })).tax).toBe("Tax applied")
		expect(statementOf(projectionRunFixture({ tax: "not_applied" })).tax).toBe("Tax not applied")
		expect(statementOf(projectionRunFixture({ tax: "mixed" })).tax).toBe(
			"Tax mixed across the two sides",
		)
	})

	test("formats the As-of and the horizon, and names the engine and the Scenario", () => {
		const statement = statementOf(projectionRunFixture())
		expect(statement.asOf).toBe("31 Oct 2026")
		expect(statement.horizon).toBe("31 Dec 2028")
		expect(statement.engine).toBe("@fixture/engine 9.8.7")
		expect(statement.scenario).toBe(SCENARIO.name)
	})

	test("shows the two content hashes in twelve characters, with the full hashes kept", () => {
		const [content, effective] = statementOf(projectionRunFixture()).hashes
		expect(content?.short).toBe("0123456789ab")
		expect(content?.full).toBe(SCENARIO.contentHash)
		expect(effective?.short).toBe("fedcba987654")
		expect(effective?.full).toBe(SCENARIO.effectiveContentHash)
	})

	test("keeps every note in the order the CLI stated it", () => {
		const notes = ["first note", "second note", "third note"]
		expect(statementOf(projectionRunFixture({ notes })).notes).toEqual(notes)
	})

	test("has no Overrides when none were applied", () => {
		expect(statementOf(projectionRunFixture({ overrides: [] })).overrides).toEqual([])
	})

	test("shows each applied Override with its path and its value as JSON", () => {
		const statement = statementOf(
			projectionRunFixture({
				overrides: [
					{ path: "income.salary.monthly", value: "95000.00" },
					{ path: "flows.rent.enabled", value: false },
				],
			}),
		)
		expect(statement.overrides).toEqual([
			{ path: "income.salary.monthly", display: '"95000.00"', sensitive: true },
			{ path: "flows.rent.enabled", display: "false", sensitive: false },
		])
	})

	test("marks a numeric Override as money so hide-amounts masks it, and leaves a word alone", () => {
		const [amount, word] = statementOf(
			projectionRunFixture({
				overrides: [
					{ path: "rate", value: 0.05 },
					{ path: "scenario.label", value: "monthly" },
				],
			}),
		).overrides
		expect(amount?.sensitive).toBe(true)
		expect(word?.sensitive).toBe(false)
	})
})

describe("shortHash", () => {
	test("keeps the first twelve characters of the digest, without the algorithm prefix", () => {
		expect(shortHash("jcs1:sha256:0123456789abcdef0123456789abcdef")).toBe("0123456789ab")
	})

	test("returns a bare digest unchanged, up to twelve characters", () => {
		expect(shortHash("abc")).toBe("abc")
	})
})
