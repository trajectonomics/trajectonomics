import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
]
const level = { principal: 10_000_000, payments: 12, rounding: "halfUp" }

/** The problems of one Flow, as `path code` strings, so a duplicate shows as two equal lines. */
function problemsOf(flow: Record<string, unknown>): string[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	}
	return check(baseline, scenario, timeline).map(
		(problem) => `${problem.path.join("/")} ${problem.code}`,
	)
}

describe("a level beside another amount form is refused once", () => {
	it("reports a level on a withdrawal once, at level", () => {
		const flow = {
			id: "borrow",
			kind: "withdrawal",
			source: "loan",
			frequency: "once",
			start: "2026-02-01",
			amount: 500,
			growth: { bps: 0 },
			level,
		}
		expect(problemsOf(flow)).toEqual(["scenario/flows/0/level FIELD_NOT_ALLOWED"])
	})

	it("reports a level on an income once, at level", () => {
		const flow = {
			id: "salary",
			kind: "income",
			earned: true,
			frequency: "monthly",
			start: "2026-02-01",
			amount: 500,
			growth: { bps: 0 },
			level,
		}
		expect(problemsOf(flow)).toEqual(["scenario/flows/0/level FIELD_NOT_ALLOWED"])
	})

	it("reports a level alone on a withdrawal once, and no missing amount", () => {
		const flow = {
			id: "borrow",
			kind: "withdrawal",
			source: "loan",
			frequency: "once",
			start: "2026-02-01",
			level,
		}
		expect(problemsOf(flow)).toEqual(["scenario/flows/0/level FIELD_NOT_ALLOWED"])
	})
})
