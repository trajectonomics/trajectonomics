/**
 * Which field of the tax form a `traj` refusal names. `scenario tax` names a flag in its path (`--children-at-higher-rate`),
 * so a path maps to the key of that flag. A `--merge` over a plan with no stored profile names the merge, and the page then
 * offers to set the profile whole ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
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

/** The form field a refusal names, or null when it names none. A shared-interest refusal names its own field. */
export function taxFieldOfRefusal(error: ErrorBody | null): string | null {
	const key = error?.path === undefined ? "" : keyOf(error.path)
	if (!(TAX_FLAG_KEYS as readonly string[]).includes(key)) return null
	if (key === "mortgageInterest" && error?.message.includes("shared="))
		return "sharedMortgageInterest"
	return key
}

/** True when the CLI refused a `--merge` because no profile is stored: the profile has to be set whole. */
export function needsWholeProfile(error: ErrorBody | null): boolean {
	return (
		error?.code === "invalid_input" && error.path !== undefined && keyOf(error.path) === "merge"
	)
}

/**
 * The sentence for a refusal of the document (path `document`) that names Flows, and the CLI's own sentence names a flag and a
 * package the person never typed. Two refusals have that shape and are told apart by `details.labels`, the labels the CLI
 * accepts: income labels mean income Flows with no tax label it knows (the Tax labels form sets them), and any other mean
 * contribution Flows whose label it does not read (the Income page's contribution form edits them). Null when it is neither.
 */
export function flowsSentence(error: ErrorBody | null): string | null {
	const details = error?.details as { flows?: unknown; labels?: unknown } | null | undefined
	const flows = details?.flows
	if (error?.path !== "document" || !Array.isArray(flows) || flows.length === 0) return null
	if (!flows.every((flow) => typeof flow === "string")) return null
	const labels = Array.isArray(details?.labels) ? details.labels : []
	const contribution = labels.length > 0 && !labels.some((id) => String(id).startsWith("income."))
	if (contribution) {
		return `These contribution Flows carry a label the tax rules do not read: ${flows.join(", ")}. Edit the label from the contribution form on the Income page.`
	}
	return `These Flows need a tax label the tax rules read: ${flows.join(", ")}. Give each one a tax label under Tax labels on this page.`
}

/** What the form shows: its own problems, and the CLI's refusal in its own words at the field its path names, when it shows that field. */
export function taxShown(
	problems: Readonly<Record<string, string>>,
	refusal: ErrorBody | null,
	message: string | null,
	visible: readonly string[] = TAX_FLAG_KEYS,
): Shown {
	// A refusal that names an item the form does not show (a merge checks the whole profile) is shown for the whole form.
	const named = taxFieldOfRefusal(refusal)
	const refused = named !== null && visible.includes(named) ? named : null
	const text = flowsSentence(refusal) ?? message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
