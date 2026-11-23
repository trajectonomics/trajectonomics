// The plan the withdrawals test works by hand: no interest, no inflation, two expenses and a retirement Milestone.
import type { ScenarioDocument } from "../src/lib/contract"

/** The As-of the plan is read at. */
export const AS_OF = "2027-01-01"
const NONE = { bps: 0 }

/**
 * Rent of 1,000.00 a month from January to May 2027 and a gym of 100.00 a month with no end, so the savings on 1 June
 * 2027, when `retire` fires, are what the Baseline holds less 5,000.00 and 500.00. The Baseline holds the car loan, so
 * the plan declares it; nothing pays it here.
 */
export function handDocument(
	base: ScenarioDocument,
	ids: { bank: string; fund: string; loan: string },
) {
	const { levies: _levies, ...rest } = base
	return {
		...rest,
		accounts: [
			{ id: ids.bank, kind: "asset", rate: 0 },
			{ id: ids.fund, kind: "asset", rate: 0 },
			{ id: ids.loan, kind: "liability", rate: 0 },
		],
		economy: { inflation: 0 },
		cashflow: { surplus: [{ account: ids.bank }], contribute: [], withdraw: [ids.bank, ids.fund] },
		flows: [
			{
				id: "rent",
				kind: "expense",
				frequency: "monthly",
				start: AS_OF,
				end: "2027-05-31",
				amount: "1000.00",
				growth: NONE,
			},
			{
				id: "gym",
				kind: "expense",
				frequency: "monthly",
				start: AS_OF,
				amount: "100.00",
				growth: NONE,
			},
		],
		milestones: [
			{ id: "retire", combine: "all", criteria: [{ id: "date", kind: "date", on: "2027-06-01" }] },
		],
	}
}
