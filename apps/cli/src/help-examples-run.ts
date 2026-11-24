import type { Setup } from "./help-examples-setup"
import { ESTATE_PLAN } from "./projection-estate-plan"
import { INCOME_FIXTURE_PLAN } from "./projection-income-plan"
import { LOAN_SCENARIO } from "./projection-liabilities-plan"
import { chanceRulePlan } from "./projection-spending-chance-support"

/**
 * What the examples of `projection run` read, stored beside the projection fixture: the car loan, the
 * spending rule and the estate the `--liabilities`, `--spending` and `--estate` examples read, and the
 * plan whose employer pays into an Account that pays out and charges a fee (cli ADR-0067).
 */
export const RUN_SETUP: Setup = {
	ledger: "projection",
	files: {
		"car-loan.json": JSON.stringify(LOAN_SCENARIO),
		"ruled.json": JSON.stringify(chanceRulePlan(undefined)),
		"estated.json": JSON.stringify(ESTATE_PLAN),
		"funded.json": JSON.stringify(INCOME_FIXTURE_PLAN),
	},
	steps: [
		["scenario", "apply", "car-loan", "--file", "car-loan.json"],
		["scenario", "apply", "ruled", "--file", "ruled.json"],
		["scenario", "apply", "estated", "--file", "estated.json"],
		["scenario", "apply", "funded", "--file", "funded.json"],
	],
}
