import { type DemoAccountIds, demoBaseFlows } from "./base-flows"
import { DEMO_MILESTONES } from "./milestones"

export type { DemoAccountIds } from "./base-flows"
export { BASE_SALARY_END, RETIRE_EARLY_SALARY_END } from "./base-flows"

/** The Thai Levy the demo applies, and the salary label that makes it tax the salary. */
export const DEMO_TAX = { tax: "th-2026", label: "salary=income.section40_1" }

/**
 * The fictional household of `base`, whose ages pin two dates (cli ADR-0048). `me` is 60 on the last day
 * of June 2050, and `mali`, born in September 2026
 * (before the As-of), is 7 on the last day of September 2033; the Flows hold those dates, as the
 * household writes them. `me` is born in June 1990, which `DEMO_INPUT.birthDate` states to the day. The salary is not pinned, because `retire-early` moves its end.
 */
export const DEMO_HOUSEHOLD = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
		{ id: "mali", role: "dependent", relation: "child", born: "2026-09", lifeExpectancy: 90 },
	],
	anchors: [
		{ path: "flows.fund.end", person: "me", age: 60 },
		{ path: "flows.school.start", person: "mali", age: 7 },
	],
}

/** The base Scenario document: integer minor units, integer basis points, the ledger's account ids. */
export function baseScenarioDocument(ids: DemoAccountIds): Record<string, unknown> {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 300 },
		accounts: [
			{ id: ids.bank, kind: "asset", rate: 100 },
			{ id: ids.fund, kind: "asset", rate: 500 },
			{ id: ids.loan, kind: "liability", rate: 500, compounding: "monthly" },
		],
		flows: demoBaseFlows(ids),
		milestones: DEMO_MILESTONES,
		cashflow: {
			surplus: [{ account: ids.bank }],
			contribute: [ids.fund],
			withdraw: [ids.bank, ids.fund],
		},
	}
}
