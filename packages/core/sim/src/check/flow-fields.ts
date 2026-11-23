import type { Check } from "./codes"
import { needsLevy, tallyLabel } from "./levy-fields"
import { boundedInt, str } from "./scalars"
import { checkShape, type Field, opt, req } from "./shape"

const prepayment: Check = boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")

/** A field this kind of Flow never takes. */
export const NOT_ALLOWED: Field = opt((_value, path, emit) => emit("FIELD_NOT_ALLOWED", path))

export const label: (hasLevy: boolean) => Field = tallyLabel

/** A Spending `rule` on a Flow that is not an expense. */
export const NOT_EXPENSE: Field = opt((_value, path, emit) => emit("RULE_NOT_EXPENSE", path))

const MAX_CATEGORY_LENGTH = 64

/** C0 and C1 control characters, which a category may not carry. */
function isControl(character: string): boolean {
	const code = character.codePointAt(0) ?? 0
	return code < 0x20 || (code >= 0x7f && code <= 0x9f)
}

/** An expense category: text of 1 to 64 characters with no control characters, else `INVALID_CATEGORY`. */
export const expenseCategory: Check = (value, path, emit) => {
	if (typeof value !== "string") return emit("WRONG_TYPE", path)
	const characters = Array.from(value)
	const bad =
		characters.length === 0 || characters.length > MAX_CATEGORY_LENGTH || characters.some(isControl)
	if (bad) emit("INVALID_CATEGORY", path)
}

const cappedShape: Check = (value, path, emit) =>
	void checkShape(value, path, { levy: req(str), bps: req(prepayment), upTo: req(str) }, emit)

/** The optional second Prepayment share, its Levy and the Measure id it is capped at. */
export const cappedPrepayment = (hasLevy: boolean): Field => needsLevy(hasLevy, cappedShape)
