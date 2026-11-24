/**
 * Which field of the tax form a `traj` refusal names. `scenario tax` names a flag in its path (`--children-at-higher-rate`),
 * so a path maps to the key of that flag. A `--merge` over a plan with no stored profile names the merge, and the page then
 * offers to set the profile whole ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 */
import type { ErrorBody } from "../../contract"
import { TAX_FLAG_KEYS } from "../../edit/tax-flags"
import type { Shown } from "../plan-items/problems"
import { labelCommand } from "./labels"

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

/** The plan a refusal is about: its name and whether a profile is stored. */
export interface TaxPlan {
	readonly name: string
	readonly stored: boolean
}

/**
 * The sentence for a refusal of the document (path `document`) that names Flows: they carry no tax label the tax rules read,
 * and the CLI's own sentence names a flag and a package the person never typed. Null when the refusal is not that one.
 */
export function flowsSentence(error: ErrorBody | null, plan: TaxPlan): string | null {
	const flows = (error?.details as { flows?: unknown } | null | undefined)?.flows
	if (error?.path !== "document" || !Array.isArray(flows) || flows.length === 0) return null
	if (!flows.every((flow) => typeof flow === "string")) return null
	return `These Flows need a tax label the tax rules read: ${flows.join(", ")}. Give each one with ${labelCommand(plan.name, plan.stored)}.`
}

/** What the form shows: its own problems, and the CLI's refusal in its own words at the field its path names. */
export function taxShown(
	problems: Readonly<Record<string, string>>,
	refusal: ErrorBody | null,
	message: string | null,
	plan: TaxPlan,
): Shown {
	const refused = taxFieldOfRefusal(refusal)
	const text = flowsSentence(refusal, plan) ?? message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
