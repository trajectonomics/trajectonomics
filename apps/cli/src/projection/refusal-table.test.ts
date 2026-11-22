import { describe, expect, it } from "bun:test"
import { ERROR_CODES } from "@trajectonomics/core/sim"
import { REFUSALS, sentenceFor } from "./refusal-table"

describe("the engine refusal table", () => {
	it("covers every code the engine can raise, so a new one cannot ship bare", () => {
		const missing = ERROR_CODES.filter((code) => !Object.hasOwn(REFUSALS, code))
		expect(missing).toEqual([])
	})

	it("holds no code the engine no longer raises", () => {
		const known: ReadonlySet<string> = new Set(ERROR_CODES)
		expect(Object.keys(REFUSALS).filter((code) => !known.has(code))).toEqual([])
	})

	it("gives every code the CLI answers itself a sentence of its own, ending in a full stop", () => {
		for (const code of ERROR_CODES) {
			const entry = REFUSALS[code]
			if (entry === undefined || !("message" in entry)) continue
			const said = sentenceFor({ code, path: ["scenario"], date: "2026-01-01" })
			expect(said?.message.endsWith(".")).toBe(true)
			expect(said?.message.length).toBeGreaterThan(20)
		}
	})

	it("names VALUE_OVERFLOW's date and Account from the problem", () => {
		const said = sentenceFor({ code: "VALUE_OVERFLOW", date: "2030-01-31", account: "cash" })
		expect(said?.message).toContain("Account cash grew past")
		expect(said?.message).toContain("on 2030-01-31.")
	})

	it("says nothing for a code another path answers", () => {
		expect(sentenceFor({ code: "INVALID_ROUNDING", path: ["scenario"] })).toBeUndefined()
	})
})
