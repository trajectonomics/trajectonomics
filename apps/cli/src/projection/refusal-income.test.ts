import { describe, expect, it } from "bun:test"
import { sentenceFor } from "./refusal-table"

/*
 * `CONFLICTING_LABELS` is one code for two mistakes, told apart by the path the engine blames (sim ADR
 * 0027, cli ADR-0067).
 */

describe("CONFLICTING_LABELS as a sentence", () => {
	const at = (...segments: string[]) =>
		sentenceFor({ code: "CONFLICTING_LABELS", path: ["scenario", ...segments] })

	it("says a payout label beside returnLabel would tally the same money twice, and the way out", () => {
		const said = at("accounts", "2", "payout", "label")
		expect(said?.message).toMatch(/payout carries a label beside the Account's returnLabel/)
		expect(said?.message.endsWith(".")).toBe(true)
		expect(said?.hint).toContain('remove "returnLabel"')
	})

	it("says returnLabel beside gainLabel is the other mistake", () => {
		const said = at("accounts", "2", "gainLabel")
		expect(said?.message).toMatch(/returnLabel and a gainLabel/)
		expect(said?.hint).toContain('"returnLabel" or "gainLabel"')
	})
})
