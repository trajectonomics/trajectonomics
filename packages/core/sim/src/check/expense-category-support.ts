import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
]
const EXPENSE = {
	id: "groceries",
	kind: "expense",
	amount: 500,
	frequency: "monthly",
	start: "2026-02-01",
	growth: { bps: 0 },
}

/** The problems of one Flow, as `path code` strings, so a duplicate shows as two equal lines. */
export function problemsOf(flow: Record<string, unknown>): string[] {
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

/** An expense with the given `category`, so the category is the only difference between cases. */
export const withCategory = (category: unknown): Record<string, unknown> => ({
	...EXPENSE,
	category,
})
