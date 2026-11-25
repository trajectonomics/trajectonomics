import type { Check } from "./codes"
import { isLabelText } from "./label-rule"
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

/** The rule an expense category must meet, in the words a refusal quotes (ADR 0018, amended 2026-11-25). */
export const EXPENSE_CATEGORY_RULE =
	"1 to 64 code points, no control, invisible or bidirectional characters, and no leading or trailing whitespace"

/** An expense category: text that meets {@link EXPENSE_CATEGORY_RULE}, else `INVALID_CATEGORY`. */
export const expenseCategory: Check = (value, path, emit) => {
	if (typeof value !== "string") return emit("WRONG_TYPE", path)
	if (!isLabelText(value, MAX_CATEGORY_LENGTH)) emit("INVALID_CATEGORY", path)
}

const cappedShape: Check = (value, path, emit) =>
	void checkShape(value, path, { levy: req(str), bps: req(prepayment), upTo: req(str) }, emit)

/** The optional second Prepayment share, its Levy and the Measure id it is capped at. */
export const cappedPrepayment = (hasLevy: boolean): Field => needsLevy(hasLevy, cappedShape)
