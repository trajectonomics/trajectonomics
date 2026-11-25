/**
 * The form's draft of a tax profile, and the flags it makes. Every item is the text the person typed. A change to a stored
 * profile sends only the items that differ (`--merge`); a profile set whole sends what is filled and chooses the filing status,
 * which has no default here. `traj` parses and checks every value ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)).
 */
import type { TaxProfile } from "../../contract"
import { AMOUNT_SHAPE, COUNT_SHAPE, TAX_FLAG_KEYS, type TaxFlags } from "../../edit/tax-flags"
import type { Problems } from "../plan-items/problems"
import { AMOUNT_FIELDS, COUNT_FIELDS, type TaxField } from "./fields"

/** The draft: one text per item, the filing status "" until chosen. */
export type TaxDraft = Record<(typeof TAX_FLAG_KEYS)[number], string>

/** The flags a draft makes, or the problems at its fields. */
export type TaxResult = { ok: true; flags: TaxFlags } | { ok: false; problems: Problems }

const FIELDS = [...COUNT_FIELDS, ...AMOUNT_FIELDS]

/** An empty draft: nothing is pre-filled for a plan with no stored profile. */
export function blankDraft(): TaxDraft {
	return Object.fromEntries(TAX_FLAG_KEYS.map((key) => [key, ""])) as TaxDraft
}

/** The draft of a stored profile, or an empty one: an absent key reads as empty. */
export function draftOf(profile: TaxProfile | null): TaxDraft {
	const draft = blankDraft()
	if (profile === null) return draft
	const stored = profile as Record<string, unknown>
	for (const key of TAX_FLAG_KEYS) draft[key] = stored[key] === undefined ? "" : String(stored[key])
	return draft
}

/** A problem at a field when its text is not shaped as `traj` reads it; the empty text is left to the caller. */
function shapeProblem(kind: "count" | "amount", text: string): string | undefined {
	if (kind === "count") return COUNT_SHAPE.test(text) ? undefined : "Use whole digits, such as 2."
	return AMOUNT_SHAPE.test(text)
		? undefined
		: "Use digits, with at most two decimals, such as 20000 or 1250.50."
}

/** What one item of a change makes: its flag text, a problem, or nothing when it is as stored. */
type Item = { flag: string } | { problem: string } | null

/** The filing status of a draft: chosen, or a problem, because it has no default here. */
function statusItem(text: string): Item {
	return text === "" ? { problem: "Choose a filing status." } : { flag: text }
}

/** The item of a change: an emptied item is stated as zero (it is taken out), but a children count cannot be emptied. */
function changedItem(field: TaxField, text: string, before: string): Item {
	if (text === before) return null
	if (text !== "") {
		const problem = shapeProblem(field.kind, text)
		return problem === undefined ? { flag: text } : { problem }
	}
	const counted = field.key === "children" || field.key === "childrenAtHigherRate"
	return counted ? { problem: "Enter a count, 0 for none." } : { flag: "0" }
}

/** Collects the items of a draft into the flags they make and the problems at their fields. */
function collect(items: readonly (readonly [string, Item])[]): TaxResult {
	const problems: Record<string, string> = {}
	const flags: Record<string, string> = {}
	for (const [key, item] of items) {
		if (item === null) continue
		if ("flag" in item) flags[key] = item.flag
		else problems[key] = item.problem
	}
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	return { ok: true, flags: flags as TaxFlags }
}

/**
 * The flags of a change: each item whose text differs from `origin`, the draft the form opened with. Comparing with the
 * origin and not with the profile stored now keeps an item someone else changed since untouched. Nothing changed is a
 * problem, because a merge needs one item.
 */
export function mergeFlags(origin: TaxDraft, draft: TaxDraft): TaxResult {
	const status: Item =
		draft.filingStatus === origin.filingStatus ? null : statusItem(draft.filingStatus)
	const result = collect([
		["filingStatus", status],
		...FIELDS.map(
			(field) =>
				[field.key, changedItem(field, draft[field.key].trim(), origin[field.key])] as const,
		),
	])
	if (result.ok && Object.keys(result.flags).length === 0) {
		return { ok: false, problems: { general: "Nothing is changed." } }
	}
	return result
}

/** The flags of a whole profile: the chosen filing status and each item that is filled. */
export function wholeFlags(draft: TaxDraft): TaxResult {
	const status = statusItem(draft.filingStatus)
	return collect([
		["filingStatus", status],
		...FIELDS.map((field) => {
			const text = draft[field.key].trim()
			const problem = text === "" ? undefined : shapeProblem(field.kind, text)
			const item: Item = text === "" ? null : problem === undefined ? { flag: text } : { problem }
			return [field.key, item] as const
		}),
	])
}
