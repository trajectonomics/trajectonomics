import { describe, expect, it } from "bun:test"
import { scenarioDocumentError } from "./document-error"
import { scenarioExample } from "./shape/index"
import { VERSION } from "./shape/testing"

// Each of the six loan codes (sim ADR-0016), and the sale and funding codes (sim ADR-0021), is stated in
// words by `scenario apply`, at its path, and keeps the schema hint every document refusal carries (ADR-0052).
const SCHEMA_HINT = 'Run "traj schema scenario apply" to see the document schema.'
const CASH = { id: "cash", kind: "asset", rate: 0 }
const LOAN = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }

function documentWith(flow: Record<string, unknown>, loan: Record<string, unknown> = LOAN) {
	return {
		...scenarioExample(VERSION ?? 0),
		estate: {},
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

/** An estate block whose cost takes a share of a liability, which `scenario apply` refuses as a document. */
const ESTATE_ON_LOAN = {
	...documentWith({
		id: "save",
		kind: "contribution",
		target: "cash",
		frequency: "monthly",
		start: "2026-01-01",
		amount: 100,
		growth: { bps: 0 },
	}),
	estate: { costs: [{ id: "fee", of: { accounts: ["loan"] }, bps: 100, rounding: "floor" }] },
}

const CASES: readonly (readonly [string, Record<string, unknown>, string])[] = [
	[
		"WITHDRAWAL_LOCKED",
		documentWith(
			{
				id: "sell",
				kind: "withdrawal",
				frequency: "once",
				start: "2026-01-01",
				amount: 100,
				growth: { bps: 0 },
				source: "vault",
			},
			{ id: "vault", kind: "asset", rate: 0, lockedUntil: "2027-01-01" },
		),
		"document.flows.0.start",
	],
	[
		"FUNDING_ON_LIABILITY",
		documentWith({
			id: "pay",
			kind: "contribution",
			target: "loan",
			frequency: "monthly",
			start: "2026-01-01",
			amount: 100,
			growth: { bps: 0 },
			funding: "obligation",
		}),
		"document.flows.0.funding",
	],
	[
		"OBLIGATION_TARGET_WITHDRAWN",
		{
			...documentWith({
				id: "buy",
				kind: "contribution",
				target: "cash",
				frequency: "once",
				start: "2026-01-01",
				amount: 100,
				growth: { bps: 0 },
				funding: "obligation",
			}),
			cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		},
		"document.flows.0.target",
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
	["ESTATE_ACCOUNT_LIABILITY", ESTATE_ON_LOAN, "document.estate.costs.0.of.accounts.0"],
	[
		"LEVEL_PAYMENT_OVERFLOW",
		documentWith(levelFlow({}, { principal: 9_000_000_000_000_000, payments: 1 })),
		"document.flows.0.level",
	],
]

describe("the loan, sale and funding refusals of scenario apply", () => {
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
