/**
 * @trajectonomics/sim — Pure, deterministic personal-finance projection engine.
 *
 * Vocabulary types, `check()`, the deterministic projection engine and the Levy Measure evaluator.
 */

export { chanceOfSuccess } from "./chance/chance-of-success"
export { check } from "./check"
export { allowedValues } from "./check/allowed"
export type { ErrorCode, Path, Problem } from "./check/codes"
export { ERROR_CODES } from "./check/codes"
export { project } from "./engine/project"
export { financialIndependence } from "./fi/financial-independence"
export { evaluateMeasures } from "./levy/evaluate"
export { contributionSavings } from "./levy/savings"
export {
	type LevelPaymentInput,
	levelPayment,
	MAX_LEVEL_PAYMENTS,
	type PeriodsPerYear,
} from "./loan/level"
export { planReturnModel } from "./market/plan-model"
export type * from "./types"
