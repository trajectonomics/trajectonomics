import { describe, expect, it } from "bun:test"
import { SCENARIO_DOCUMENT } from "../store/testing"
import type { ScenarioProblem } from "./document"
import { wordsOf } from "./problem-words"
import { type AppliedItem, documentFailure } from "./set-document"

// The five loan codes the engine raises (sim ADR-0016) that the refusal table words. WITHDRAWAL_SOURCE_KIND
// is gone: sim ADR-0021 removed it, so it is no longer an engine code and cannot be stated here.
const SCHEMA_HINT = 'Run "traj schema scenario apply" to see the document schema.'

const LOAN_PROBLEMS: readonly (readonly [ScenarioProblem, string])[] = [
	[{ code: "LEVEL_TARGET_NOT_LIABILITY", segments: ["flows", 0, "target"] }, "target"],
	[{ code: "LEVEL_TARGET_NOT_NOMINAL", segments: ["flows", 0, "target"] }, "target"],
	[{ code: "LEVEL_FREQUENCY_MISMATCH", segments: ["flows", 0, "frequency"] }, "frequency"],
	[{ code: "LEVEL_PAYMENTS_OUT_OF_RANGE", segments: ["flows", 0, "level", "payments"] }, "level"],
	[{ code: "LEVEL_PAYMENT_OVERFLOW", segments: ["flows", 0, "level"] }, "level"],
]

describe("a --set that breaks a loan says it in words, sentence first (#336)", () => {
	for (const [problem, field] of LOAN_PROBLEMS) {
		it(`words ${problem.code} as the document form does, then the schema hint`, () => {
			const items: AppliedItem[] = [{ flag: "set", path: `flows.salary.${field}` }]
			const error = documentFailure(items, [problem], SCENARIO_DOCUMENT)
			const said = wordsOf(problem)
			if (said === undefined) throw new Error(`${problem.code} has no sentence`)

			expect(error.body.code).toBe("invalid_input")
			expect(error.body.path).toBe("set")
			expect(error.body.message).toBe(`set: ${said.message}`)
			expect(error.body.message).not.toContain(problem.code)
			expect(error.body.hint).toBe(
				[said.hint, SCHEMA_HINT].filter((part) => part !== undefined).join(" "),
			)
			expect(error.body.details).toMatchObject({
				index: 0,
				path: `flows.salary.${field}`,
				code: problem.code,
			})
		})
	}
})
