import type { Check } from "./codes"
import { isDisplayLabel } from "./label-rule"

/**
 * A Flow's or a Milestone's optional display label (sim ADR 0032): free text of 1 to 80 code
 * points that a person reads, never a key and never read by the engine. The wording is
 * `DISPLAY_LABEL_RULE`; a value outside it is `INVALID_LABEL`.
 */
export const displayLabel: Check = (value, path, emit) => {
	if (typeof value !== "string") return emit("WRONG_TYPE", path)
	if (!isDisplayLabel(value)) emit("INVALID_LABEL", path)
}
