import type { Setup } from "./help-examples-setup"
import { ESTATE_PLAN } from "./projection-estate-plan"
import { INCOME_FIXTURE_PLAN } from "./projection-income-plan"
import { LOAN_SCENARIO } from "./projection-liabilities-plan"
import { ROUTED_FIXTURE_PLAN } from "./projection-routing-fixture"
import { chanceRulePlan } from "./projection-spending-chance-support"

/**
 * What the examples of `projection run` read, stored beside the projection fixture: the car loan, the
 * spending rule and the estate the `--liabilities`, `--spending` and `--estate` examples read, and the
 * plan whose employer pays into an Account that pays out and charges a fee (cli ADR-0067), the plan with a share,
 * a Reserve floor, a target that keeps its value and two transfers (cli ADR-0070), and a taxed fork of the base plan
 * (cli ADR-0036).
 */
export const RUN_SETUP: Setup = {
	ledger: "projection",
	files: {
		"car-loan.json": JSON.stringify(LOAN_SCENARIO),
		"ruled.json": JSON.stringify(chanceRulePlan(undefined)),
		"estated.json": JSON.stringify(ESTATE_PLAN),
		"funded.json": JSON.stringify(INCOME_FIXTURE_PLAN),
		"routed.json": JSON.stringify(ROUTED_FIXTURE_PLAN),
	},
	steps: [
		["scenario", "apply", "car-loan", "--file", "car-loan.json"],
		["scenario", "apply", "ruled", "--file", "ruled.json"],
		["scenario", "apply", "estated", "--file", "estated.json"],
		["scenario", "apply", "funded", "--file", "funded.json"],
		// The base plan with the Thai Levy on its salary, so a tax year has a walk to state (cli ADR-0036).
		["scenario", "fork", "base", "taxed"],
		["scenario", "tax", "taxed", "--tax", "th-2026", "--label", "salary=income.section40_1"],
		["scenario", "apply", "routed", "--file", "routed.json"],
	],
}
