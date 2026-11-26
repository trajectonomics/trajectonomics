/**
 * The flags a draft of a tax profile makes ([web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)): a change
 * sends what differs, a whole write what is filled, and `--mortgage-interest shared=<amount>` on a separate filing only. Pure.
 */
import type { TaxProfile } from "../../contract"
import { AMOUNT_SHAPE, COUNT_SHAPE, type TaxFlags } from "../../edit/tax-flags"
import type { Problems } from "../plan-items/problems"
import type { TaxDraft } from "./draft"
import { AMOUNT_FIELDS, COUNT_FIELDS, type TaxField } from "./fields"
import { groupDigits, type ShownAmount } from "./rows"

/** The flags a draft makes, or the problems at its fields. */
export type TaxResult = { ok: true; flags: TaxFlags } | { ok: false; problems: Problems }

const FIELDS = [...COUNT_FIELDS, ...AMOUNT_FIELDS]

function shapeProblem(kind: "count" | "amount", text: string): string | undefined {
	if (kind === "count") return COUNT_SHAPE.test(text) ? undefined : "Use whole digits, such as 2."
	return AMOUNT_SHAPE.test(text)
		? undefined
		: "Use digits, with at most two decimals, such as 20000 or 1250.50."
}

/** One item of a change: its flag text, a problem, or nothing when it is as stored. */
type Item = { flag: string } | { problem: string } | null

function statusItem(text: string): Item {
	return text === "" ? { problem: "Choose a filing status." } : { flag: text }
}

/** An emptied item is stated as zero (it is taken out), but a children count cannot be emptied. */
function changedItem(field: TaxField, text: string, before: string): Item {
	if (text === before) return null
	if (text !== "") {
		const problem = shapeProblem(field.kind, text)
		return problem === undefined ? { flag: text } : { problem }
	}
	const counted = field.key === "children" || field.key === "childrenAtHigherRate"
	return counted ? { problem: "Enter a count, 0 for none." } : { flag: "0" }
}

function wholeItem(field: TaxField, text: string): Item {
	if (text === "") return null
	const problem = shapeProblem(field.kind, text)
	return problem === undefined ? { flag: text } : { problem }
}

/** Stated only on a separate filing, where `traj` reads `shared=`; under another status the profile keeps none. */
function sharedItem(field: TaxField, draft: TaxDraft, before: string | null): Item {
	if (draft.filingStatus !== "married_separate") return null
	const text = draft.sharedMortgageInterest.trim()
	return before === null ? wholeItem(field, text) : changedItem(field, text, before)
}

/** One item of the draft, with the shared interest told apart from the items every status states. */
function itemOf(field: TaxField, draft: TaxDraft, origin: TaxDraft | null): Item {
	if (field.key !== "sharedMortgageInterest") {
		const text = draft[field.key].trim()
		return origin === null ? wholeItem(field, text) : changedItem(field, text, origin[field.key])
	}
	return sharedItem(field, draft, origin?.[field.key] ?? null)
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

/** The flags of a change, each item whose text differs from `origin`, the draft the form opened with. Nothing changed is a problem. */
export function mergeFlags(origin: TaxDraft, draft: TaxDraft): TaxResult {
	const status = draft.filingStatus === origin.filingStatus ? null : statusItem(draft.filingStatus)
	const result = collect([
		["filingStatus", status],
		...FIELDS.map((field) => [field.key, itemOf(field, draft, origin)] as const),
	])
	if (result.ok && Object.keys(result.flags).length === 0) {
		return { ok: false, problems: { general: "Nothing is changed." } }
	}
	return result
}

/** The flags of a whole profile: the chosen filing status and each item that is filled. */
export function wholeFlags(draft: TaxDraft): TaxResult {
	return collect([
		["filingStatus", statusItem(draft.filingStatus)],
		...FIELDS.map((field) => [field.key, itemOf(field, draft, null)] as const),
	])
}

/**
 * The sentence a whole save shows when it would drop a stored shared home-loan interest, or null when it keeps it. An
 * all-zero amount is stated as `shared=0`, which the CLI reads as a removal, so it drops the value as an empty one does.
 * The words stay apart from the amount, so Hide amounts masks only the digits and keeps the currency and the words.
 */
export function sharedDropWarning(
	profile: TaxProfile | null,
	whole: boolean,
	draft: TaxDraft,
): SharedDropWarning | null {
	const stored = profile?.sharedMortgageInterest
	const text = draft.sharedMortgageInterest.trim()
	if (!whole || stored === undefined || draft.filingStatus === "") return null
	const kept = draft.filingStatus === "married_separate" && text !== "" && !/^0+(\.0*)?$/.test(text)
	if (kept) return null
	return {
		before: "This save drops the stored shared home-loan interest of ",
		amount: { digits: groupDigits(stored), after: " THB" },
		after: ".",
	}
}

/** The warning's words before the amount, the amount itself, and the words after it. */
export interface SharedDropWarning {
	readonly before: string
	readonly amount: ShownAmount
	readonly after: string
}
