import { describe, expect, it } from "bun:test"
import { scenarioDocumentError } from "./document"
import { scenarioExample } from "./shape/index"
import { VERSION } from "./shape/testing"

// Each of the six loan codes (sim ADR-0016) is stated in words by `scenario apply`, at its path, and
// keeps the schema hint every document refusal carries (ADR-0052).
const SCHEMA_HINT = 'Run "traj schema scenario apply" to see the document schema.'
const CASH = { id: "cash", kind: "asset", rate: 0 }
const LOAN = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }

function documentWith(flow: Record<string, unknown>, loan: Record<string, unknown> = LOAN) {
	return {
		...scenarioExample(VERSION ?? 0),
		accounts: [CASH, loan],
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
	}
}

function levelFlow(overrides: Record<string, unknown>, level: Record<string, unknown> = {}) {
	return {
		id: "pay",
		kind: "contribution",
		target: "loan",
		frequency: "monthly",
		start: "2026-01-01",
		level: { principal: 100_000, payments: 12, rounding: "halfUp", ...level },
		...overrides,
	}
}

const CASES: readonly (readonly [string, Record<string, unknown>, string])[] = [
	[
		"WITHDRAWAL_SOURCE_KIND",
		documentWith({
			id: "draw",
			kind: "withdrawal",
			frequency: "once",
			start: "2026-01-01",
			amount: 100,
			growth: { bps: 0 },
			source: "cash",
		}),
		"document.flows.0.source",
	],
	[
		"LEVEL_TARGET_NOT_LIABILITY",
		documentWith(levelFlow({ target: "cash" })),
		"document.flows.0.target",
	],
	[
		"LEVEL_TARGET_NOT_NOMINAL",
		documentWith(levelFlow({}), { id: "loan", kind: "liability", rate: 600 }),
		"document.flows.0.target",
	],
	[
		"LEVEL_FREQUENCY_MISMATCH",
		documentWith(levelFlow({ frequency: "quarterly" })),
		"document.flows.0.frequency",
	],
	[
		"LEVEL_PAYMENTS_OUT_OF_RANGE",
		documentWith(levelFlow({}, { payments: 0 })),
		"document.flows.0.level.payments",
	],
	[
		"LEVEL_PAYMENT_OVERFLOW",
		documentWith(levelFlow({}, { principal: 9_000_000_000_000_000, payments: 1 })),
		"document.flows.0.level",
	],
]

describe("the six loan refusals of scenario apply", () => {
	for (const [code, document, path] of CASES) {
		it(`states ${code} in words at ${path}, and keeps the schema hint`, () => {
			const error = scenarioDocumentError(document)
			if (error === null) throw new Error(`${code}: the document was accepted`)
			expect((error.body.details as readonly unknown[] | undefined)?.[0]).toMatchObject({
				code,
				path,
			})
			expect(error.body.path).toBe(path)
			expect(error.body.message).not.toContain(code)
			expect(error.body.hint).toEndWith(SCHEMA_HINT)
			expect(error.body.hint).not.toBe(SCHEMA_HINT)
		})
	}
})
