/**
 * Which field of the tax form a `traj` refusal names. `scenario tax` names a flag in its path (`--children-at-higher-rate`),
 * so a path maps to the key of that flag. A `--merge` over a plan with no stored profile names the merge, and the page then
 * offers to set the profile whole ([web ADR 0015](../../../../docs/adr/0015-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 */
import type { ErrorBody } from "../../contract"
import { TAX_FLAG_KEYS } from "../../edit/tax-flags"
import type { Shown } from "../plan-items/problems"

/** A flag's path as a key: `--children-at-higher-rate` is `childrenAtHigherRate`. */
function keyOf(path: string): string {
	return path
		.replace(/^-+/, "")
		.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

/** The form field a refusal names, or null when it names none. */
export function taxFieldOfRefusal(error: ErrorBody | null): string | null {
	const key = error?.path === undefined ? "" : keyOf(error.path)
	return (TAX_FLAG_KEYS as readonly string[]).includes(key) ? key : null
}

/** True when the CLI refused a `--merge` because no profile is stored: the profile has to be set whole. */
export function needsWholeProfile(error: ErrorBody | null): boolean {
	return (
		error?.code === "invalid_input" && error.path !== undefined && keyOf(error.path) === "merge"
	)
}

/** What the form shows: its own problems, and the CLI's refusal in its own words at the field its path names. */
export function taxShown(
	problems: Readonly<Record<string, string>>,
	refusal: ErrorBody | null,
	message: string | null,
): Shown {
	const refused = taxFieldOfRefusal(refusal)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
