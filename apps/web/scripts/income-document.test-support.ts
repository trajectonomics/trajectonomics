import type { ScenarioDocument } from "../src/lib/contract"
import { AS_OF, PROVIDENT } from "./income-names.test-support"

const NONE = { bps: 0 }

/** The plan: no interest and no inflation; a salary of 100,000.00 a month that stops when `retire` fires on 1 July 2027. */
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
			{ id: PROVIDENT, kind: "asset", rate: 0 },
			{ id: ids.loan, kind: "liability", rate: 0 },
		],
		economy: { inflation: 0 },
		cashflow: { surplus: [{ account: ids.bank }], contribute: [], withdraw: [ids.bank] },
		flows: [
			{
				id: "salary",
				kind: "income",
				frequency: "monthly",
				start: AS_OF,
				endAt: "retire",
				amount: "100000.00",
				growth: NONE,
				earned: true,
			},
		],
		milestones: [
			{ id: "retire", combine: "all", criteria: [{ id: "date", kind: "date", on: "2027-07-01" }] },
		],
	}
}
