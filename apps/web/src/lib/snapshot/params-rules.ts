import type { ChanceErrorCode } from "./chance-params"
import { isValidDate } from "./dates"
import type { ParamsError, ParamsErrorCode, PlanInput } from "./params"

const MESSAGES: Record<Exclude<ParamsErrorCode, ChanceErrorCode | "invalid_allowances">, string> = {
	as_of_required: "Pass --as-of YYYY-MM-DD.",
	invalid_as_of: "--as-of must be a YYYY-MM-DD date that exists.",
	horizon_required: "Pass --horizon YYYY-MM-DD.",
	invalid_horizon: "--horizon must be a YYYY-MM-DD date that exists.",
	horizon_before_as_of: "--horizon must not be before --as-of.",
	compare_needs_two_names: "--compare takes two plan names: --compare A B.",
	invalid_birth_date: "--birth-date must be a YYYY-MM-DD date that exists.",
	age_needs_birth_date: "--age needs --birth-date, so the ages count from a birth date.",
	invalid_age: "--age must be a whole number from 0 up.",
}

export type Check = ParamsError | null

/** The first rule the dates break, or null when they hold. */
export function checkDates(input: PlanInput): Check {
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
export function checkAges(input: PlanInput): Check {
	if (input.birthDate !== null && !isValidDate(input.birthDate)) {
		return { code: "invalid_birth_date", message: MESSAGES.invalid_birth_date }
	}
	if (input.ages.length > 0 && input.birthDate === null) {
		return { code: "age_needs_birth_date", message: MESSAGES.age_needs_birth_date }
	}
	const badAge = input.ages.some((age) => !Number.isSafeInteger(age) || age < 0)
	return badAge ? { code: "invalid_age", message: MESSAGES.invalid_age } : null
}

export function checkCompare(input: PlanInput): Check {
	const bad = input.compare !== null && (input.compare.a === "" || input.compare.b === "")
	return bad ? { code: "compare_needs_two_names", message: MESSAGES.compare_needs_two_names } : null
}
