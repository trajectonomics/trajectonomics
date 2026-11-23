import { type AllowancePlan, checkAllowances } from "./allowance-params"
import { type ChanceErrorCode, type ChancePlan, chancePlanOf, checkChance } from "./chance-params"
import { checkAges, checkCompare, checkDates } from "./params-rules"

/** The caller's parameters, as the command line states them. An unset date is null. */
export type PlanInput = {
	asOf: string | null
	horizon: string | null
	/** The Scenarios to project by name; empty means every Scenario in the ledger. */
	scenarios: readonly string[]
	compare: { a: string; b: string } | null
	birthDate: string | null
	ages: readonly number[]
	monthly: boolean
	/** Whether the caller supplies Carry-in records; the records themselves are read by the runner. */
	carryIn: boolean
	/** The Return model file the chance reads draw from. The three chance flags go together. */
	returnModel: string | null
	paths: number | null
	seed: string | null
	/** The `projection allowances` reads' inputs; left out or null, the Snapshot reads none. */
	allowances?: AllowancePlan | null | undefined
}

/** The parameters once every rule has held. */
export type PlanParams = {
	asOf: string
	horizon: string
	scenarios: readonly string[]
	compare: { a: string; b: string } | null
	birthDate: string | null
	ages: readonly number[]
	monthly: boolean
	carryIn: boolean
	/** The chance reads' inputs, or null when the caller stated no Return model. */
	chance: ChancePlan | null
	/** The allowance reads' inputs, or null when none are stated: no `projection allowances` read is made. */
	allowances: AllowancePlan | null
}

/** One code per rule the parameters can break. */
export type ParamsErrorCode =
	| "as_of_required"
	| "invalid_as_of"
	| "horizon_required"
	| "invalid_horizon"
	| "horizon_before_as_of"
	| "compare_needs_two_names"
	| "invalid_birth_date"
	| "age_needs_birth_date"
	| "invalid_age"
	| "invalid_allowances"
	| ChanceErrorCode

/** A rule the parameters broke, with the sentence a person reads. */
export type ParamsError = { code: ParamsErrorCode; message: string }

/** Checks the parameters, returning the first rule they break. */
export function checkParams(
	input: PlanInput,
): { ok: true; params: PlanParams } | { ok: false; error: ParamsError } {
	const error =
		checkDates(input) ??
		checkAges(input) ??
		checkCompare(input) ??
		checkChance(input) ??
		checkAllowances(input.allowances)
	if (error) return { ok: false, error }
	// checkDates has held, so both dates are set; the fallbacks below are never taken.
	const { returnModel: _r, paths: _p, seed: _s, allowances: _a, ...rest } = input
	return {
		ok: true,
		params: {
			...rest,
			asOf: input.asOf ?? "",
			horizon: input.horizon ?? "",
			chance: chancePlanOf(input),
			allowances: input.allowances ?? null,
		},
	}
}
