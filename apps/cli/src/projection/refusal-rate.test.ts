import { describe, expect, it } from "bun:test"
import { scenarioDocumentError } from "../scenario/document"
import { scenarioExample } from "../scenario/shape"
import { FULL_ESTATE } from "../scenario/shape/estate-fixture"
import { RULE_FLOWS } from "../scenario/shape/rule-fixture"
import { replaceAt, VERSION } from "../scenario/shape/testing"
import { sentenceFor } from "./refusal-table"

/*
 * `RATE_OUT_OF_RANGE` is one code for every rate and share of a document, each with its own range, so
 * the CLI words it by the field the engine blames (cli ADR-0065).
 */

const at = (...segments: (string | number)[]) =>
	sentenceFor({ code: "RATE_OUT_OF_RANGE", path: ["scenario", ...segments.map(String)] })

describe("RATE_OUT_OF_RANGE as a sentence, for every field that can raise it", () => {
	const cases: { name: string; path: (string | number)[]; message: RegExp; hint: RegExp }[] = [
		{
			name: "an estate cost's share",
			path: ["estate", "costs", 2, "bps"],
			message: /share of an estate cost must be from 0% to 100%/,
			hint: /basis points.*100% is 10000.*--decimal/,
		},
		{
			name: "an estate gift's share",
			path: ["estate", "gifts", 0, "bps"],
			message: /share of an estate gift must be from 0% to 100%/,
			hint: /10000/,
		},
		{
			name: "an estate line's growth",
			path: ["estate", "costs", 0, "growth", "bps"],
			message: /growth rate must be above -100%/,
			hint: /-9999/,
		},
		{
			name: "an Account's rate",
			path: ["accounts", 1, "rate"],
			message: /Account's rate is below what its kind allows/,
			hint: /basis points.*"compounding"/,
		},
		{
			name: "a Flow's growth",
			path: ["flows", 0, "growth", "bps"],
			message: /growth rate must be above -100%/,
			hint: /-9999/,
		},
		{
			name: "inflation",
			path: ["economy", "inflation"],
			message: /inflation rate must be above -100%/,
			hint: /-9999/,
		},
		{
			name: "a spending rule's rate",
			path: ["flows", 0, "rule", "rateBps"],
			message: /spending rule's rate must be from 0.01% to 100%/,
			hint: /basis points/,
		},
		{
			name: "a spending rule's step",
			path: ["flows", 0, "rule", "steps", 0, "bps"],
			message: /spending rule's rate must be from 0.01% to 100%/,
			hint: /basis points/,
		},
		{
			name: "a spending rule's bound growth",
			path: ["flows", 0, "rule", "floor", "growth", "bps"],
			message: /growth rate must be above -100%/,
			hint: /-9999/,
		},
		{
			name: "a guardrail's band",
			path: ["flows", 1, "rule", "upper", "adjustBps"],
			message: /guardrail's band must be from 0% to 100%/,
			hint: /basis points/,
		},
		{
			name: "a Levy prepayment",
			path: ["flows", 0, "prepayments", 1, "bps"],
			message: /prepayments of an income Flow ask for more than 100%/,
			hint: /10000 or less/,
		},
		{
			name: "all the prepayments of a Flow",
			path: ["flows", 0, "prepayments"],
			message: /prepayments of an income Flow ask for more than 100%/,
			hint: /10000 or less/,
		},
		{
			name: "a capped prepayment",
			path: ["flows", 0, "cappedPrepayment", "bps"],
			message: /prepayments of an income Flow ask for more than 100%/,
			hint: /10000 or less/,
		},
		{
			name: "a field with no entry of its own",
			path: ["fi", "thresholdBps"],
			message: /rate or share is outside the range its field allows/,
			hint: /basis points/,
		},
	]

	for (const { name, path, message, hint } of cases) {
		it(`words ${name}, and names the way out`, () => {
			const said = at(...path)
			expect(said?.message).toMatch(message)
			expect(said?.message.endsWith(".")).toBe(true)
			expect(said?.message).not.toContain("RATE_OUT_OF_RANGE")
			expect(said?.hint).toMatch(hint)
		})
	}

	it("words a problem on an empty path as the general sentence", () => {
		expect(sentenceFor({ code: "RATE_OUT_OF_RANGE", path: [] })?.message).toMatch(
			/outside the range/,
		)
	})
})

describe("a document refused for a rate out of range", () => {
	const base = (): Record<string, unknown> => ({
		...scenarioExample(VERSION ?? 0),
		flows: [...RULE_FLOWS],
		estate: FULL_ESTATE,
	})

	function refusal(path: (string | number)[], value: unknown) {
		const error = scenarioDocumentError(replaceAt(base(), path, value))
		if (error === null) throw new Error("the document was accepted")
		return error.body
	}

	it("says a share over 100% in a sentence, with the path and the code beside it", () => {
		const body = refusal(["estate", "costs", 0, "bps"], 10_001)
		expect(body.message).toMatch(/share of an estate cost must be from 0% to 100%/)
		expect(body.path).toBe("document.estate.costs.0.bps")
		expect(body.hint).toContain("basis points")
		expect(body.hint).toContain("traj schema scenario apply")
		expect(body.details).toEqual([
			{
				path: "document.estate.costs.0.bps",
				message: "document.estate.costs.0.bps: RATE_OUT_OF_RANGE",
				code: "RATE_OUT_OF_RANGE",
			},
		])
	})

	it("words a negative share, a rule's rate, a band and a growth in the same way", () => {
		expect(refusal(["estate", "gifts", 0, "bps"], -1).message).toMatch(/estate gift/)
		expect(refusal(["flows", 0, "rule", "rateBps"], 0).message).toMatch(/spending rule's rate/)
		expect(refusal(["flows", 1, "rule", "upper", "bps"], 10_001).message).toMatch(/guardrail/)
		expect(refusal(["estate", "costs", 2, "growth"], { bps: -10_000 }).message).toMatch(/growth/)
		expect(refusal(["economy", "inflation"], -10_000).message).toMatch(/inflation/)
	})
})
