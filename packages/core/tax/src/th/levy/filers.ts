import { TaxValidationError } from "../../core/money"
import type { ThFilingStatus } from "../types"

/**
 * Diagnostic fields of a `filers` list a Levy refuses, one per rule.
 *
 * Purpose: Names the rule an invalid list broke, so a caller can report it without parsing text.
 * Math: No arithmetic; diagnostic paths only.
 * Units: Dimensionless field paths.
 * Throws: Nothing; consumed by `TaxValidationError`.
 * @statute Thailand Revenue Code Section 57 sexies (tax ADR 0009).
 */
export enum ThLevyFilerField {
	/** The list names no Filer. */
	Empty = "levy.filers.empty",
	/** The list names more than two Filers. */
	Max = "levy.filers.max",
	/** An id does not match `[a-z0-9-]{1,32}`. */
	Id = "levy.filers.id",
	/** An id is the reserved shared id. */
	Shared = "levy.filers.shared",
	/** An id is repeated. */
	Duplicate = "levy.filers.duplicate",
	/** Two Filers on a status other than `married_joint`. */
	Count = "levy.filers.count",
	/** Filers on `married_separate_40_1_joint_rest`, which is not given Filers yet. */
	Status = "levy.filers.status",
}

/**
 * Reserved Filer id of income that cannot be attributed to one spouse.
 *
 * Purpose: Labels income of the couple, which s.57 sexies para 2 counts as half each.
 * Math: No arithmetic.
 * Units: Dimensionless id.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 57 sexies, paragraph 2.
 */
export const TH_LEVY_SHARED_FILER = "shared"

/** Id prefix of the Measures that add a Filer's tally to its share of the shared income. */
export const TH_LEVY_READ_PREFIX = "read."

/** One Filer, or two on a joint Return. */
export type ThLevyFilerIds = readonly [string] | readonly [string, string]

const FILER_ID = /^[a-z0-9-]{1,32}$/
const MAX_FILERS = 2

/**
 * Builds the Filer label of a Tally label: `<label>@<filer>`.
 *
 * Purpose: The one way to name what a Filer's Flow is tallied under, so no caller assembles it.
 * Math: String concatenation; no arithmetic.
 * Units: Dimensionless label.
 * Throws: TaxValidationError if `filer` does not match `[a-z0-9-]{1,32}`.
 *
 * @param label A Tally label such as `income.section40_1`.
 * @param filer A Filer id, or {@link TH_LEVY_SHARED_FILER}.
 * @statute Thailand Revenue Code Section 57 sexies.
 */
export function thFilerLabel(label: string, filer: string): string {
	assertFilerId(filer)
	return `${label}@${filer}`
}

function throwFiler(field: ThLevyFilerField, value: unknown, reason: string): never {
	throw new TaxValidationError(field, value, reason)
}

function assertFilerId(filer: string): void {
	if (!FILER_ID.test(filer)) {
		throwFiler(ThLevyFilerField.Id, filer, "Filer id must match [a-z0-9-]{1,32}")
	}
}

function checkIds(filers: readonly string[]): void {
	const seen = new Set<string>()
	for (const id of filers) {
		if (id === TH_LEVY_SHARED_FILER) {
			throwFiler(ThLevyFilerField.Shared, id, "Filer id must not be the reserved shared id")
		}
		assertFilerId(id)
		if (seen.has(id)) throwFiler(ThLevyFilerField.Duplicate, id, "Filer ids must not repeat")
		seen.add(id)
	}
}

/**
 * Checks a `filers` list against its count, its ids and the filing status.
 *
 * Purpose: Refuses every list a Levy cannot read, each with its own field.
 * Math: No arithmetic.
 * Units: Dimensionless ids.
 * Throws: TaxValidationError with a {@link ThLevyFilerField} for an empty list, more than two
 * Filers, an id off the pattern, the shared id, a repeated id, two Filers on a status other than
 * `married_joint`, or any Filer on `married_separate_40_1_joint_rest`.
 *
 * @param filers The list a profile names.
 * @param status The profile's filing status.
 * @returns The same ids, narrowed to one or two.
 * @statute Thailand Revenue Code Section 57 sexies.
 */
export function validateThFilers(
	filers: readonly string[],
	status: ThFilingStatus,
): ThLevyFilerIds {
	const [first, second] = filers
	if (first === undefined) {
		throwFiler(ThLevyFilerField.Empty, filers, "Filers must name at least one")
	}
	if (filers.length > MAX_FILERS) {
		throwFiler(ThLevyFilerField.Max, filers.length, "A Return has at most two Filers")
	}
	checkIds(filers)
	if (status === "married_separate_40_1_joint_rest") {
		throwFiler(ThLevyFilerField.Status, status, "This status is not given Filers yet")
	}
	if (second === undefined) return [first]
	if (status !== "married_joint") {
		throwFiler(ThLevyFilerField.Count, filers.length, "Two Filers need a married_joint Return")
	}
	return [first, second]
}
