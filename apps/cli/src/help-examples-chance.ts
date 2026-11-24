import type { Setup } from "./help-examples-setup"
import { ILLUSTRATIVE_RETURN_MODEL } from "./projection/chance-testing"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import { chanceRulePlan } from "./projection-spending-chance-support"

/**
 * What the `projection chance` and `projection path` examples need: a Return model file, the plan with a
 * spending rule that the `--spending` and spending Bands examples read (cli ADR-0063), and the plan with a
 * volatility that `--return-model plan` builds a model from (cli ADR-0068, ADR-0069).
 */
export const CHANCE_SETUP: Setup = {
	files: {
		"model.json": JSON.stringify(ILLUSTRATIVE_RETURN_MODEL),
		"ruled.json": JSON.stringify(chanceRulePlan(undefined)),
		"volatile.json": JSON.stringify(VOLATILE_PLAN),
	},
	steps: [
		["scenario", "apply", "ruled", "--file", "ruled.json"],
		["scenario", "apply", "volatile", "--file", "volatile.json"],
	],
}
