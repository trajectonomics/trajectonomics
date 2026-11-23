import { type ScenarioDocument, scenarioDocument } from "../../contract"
import { planDocument } from "./fixtures.test-support"

/**
 * The planDocument with a loan: a withdrawal that borrows 500000.00 into the `loan` Account, and a level
 * loan that repays it in 60 equal payments (cli ADR-0016). Both are parsed by the contract.
 */
export function loanPlanDocument(): ScenarioDocument {
	const plan = planDocument()
	return scenarioDocument.parse({
		...plan,
		flows: [
			...plan.flows,
			{
				id: "car-draw",
				kind: "withdrawal",
				frequency: "once",
				start: "2027-01-01",
				amount: "500000.00",
				growth: { bps: 0 },
				source: "loan",
			},
			{
				id: "car-loan",
				kind: "contribution",
				frequency: "monthly",
				start: "2027-02-01",
				target: "loan",
				level: { principal: "500000.00", payments: 60, rounding: "halfUp" },
			},
		],
	})
}
