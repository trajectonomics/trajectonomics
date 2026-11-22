import { type ChanceErrorCode, type ChancePlan, chancePlanOf, checkChance } from "./chance-params"
import { isValidDate } from "./dates"

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
	| ChanceErrorCode

/** A rule the parameters broke, with the sentence a person reads. */
export type ParamsError = { code: ParamsErrorCode; message: string }

const MESSAGES: Record<Exclude<ParamsErrorCode, ChanceErrorCode>, string> = {
	as_of_required: "Pass --as-of YYYY-MM-DD.",
	invalid_as_of: "--as-of must be a YYYY-MM-DD date that exists.",
	horizon_required: "Pass --horizon YYYY-MM-DD.",
	invalid_horizon: "--horizon must be a YYYY-MM-DD date that exists.",
	horizon_before_as_of: "--horizon must not be before --as-of.",
	compare_needs_two_names: "--compare takes two Scenario names: --compare A B.",
	invalid_birth_date: "--birth-date must be a YYYY-MM-DD date that exists.",
	age_needs_birth_date: "--age needs --birth-date, so the ages count from a birth date.",
	invalid_age: "--age must be a whole number from 0 up.",
}

type Check = ParamsError | null

/** The first rule the dates break, or null when they hold. */
function checkDates(input: PlanInput): Check {
	if (input.asOf === null) return { code: "as_of_required", message: MESSAGES.as_of_required }
	if (!isValidDate(input.asOf)) return { code: "invalid_as_of", message: MESSAGES.invalid_as_of }
	if (input.horizon === null)
		return { code: "horizon_required", message: MESSAGES.horizon_required }
	if (!isValidDate(input.horizon)) {
		return { code: "invalid_horizon", message: MESSAGES.invalid_horizon }
	}
	if (input.horizon < input.asOf) {
		return { code: "horizon_before_as_of", message: MESSAGES.horizon_before_as_of }
	}
	return null
}

/** The first rule the birth date and the ages break, or null when they hold. */
function checkAges(input: PlanInput): Check {
	if (input.birthDate !== null && !isValidDate(input.birthDate)) {
		return { code: "invalid_birth_date", message: MESSAGES.invalid_birth_date }
	}
	if (input.ages.length > 0 && input.birthDate === null) {
		return { code: "age_needs_birth_date", message: MESSAGES.age_needs_birth_date }
	}
	const badAge = input.ages.some((age) => !Number.isSafeInteger(age) || age < 0)
	return badAge ? { code: "invalid_age", message: MESSAGES.invalid_age } : null
}

/** Checks the parameters, returning the first rule they break. */
export function checkParams(
	input: PlanInput,
): { ok: true; params: PlanParams } | { ok: false; error: ParamsError } {
	const error = checkDates(input) ?? checkAges(input) ?? checkCompare(input) ?? checkChance(input)
	if (error) return { ok: false, error }
	// checkDates has held, so both dates are set; the fallbacks below are never taken.
	const { returnModel: _r, paths: _p, seed: _s, ...rest } = input
	return {
		ok: true,
		params: {
			...rest,
			asOf: input.asOf ?? "",
			horizon: input.horizon ?? "",
			chance: chancePlanOf(input),
		},
	}
}

function checkCompare(input: PlanInput): Check {
	const bad = input.compare !== null && (input.compare.a === "" || input.compare.b === "")
	return bad ? { code: "compare_needs_two_names", message: MESSAGES.compare_needs_two_names } : null
}
