import { type ScenarioAccount, scenarioAccount } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import type { AccountDraft } from "./accounts"
import { isDateText, slugId, uniqueId, withoutKeys } from "./form"
import type { Problems } from "./problems"

/** The outcome of an Account form: the Account to save, or the problems it shows at its fields. */
export type AccountResult =
	| { ok: true; account: ScenarioAccount }
	| { ok: false; problems: Problems }

/** The problems an Account draft has at its fields. */
function problemsOf(draft: AccountDraft, isNew: boolean): Map<string, string> {
	const problems = new Map<string, string>()
	if (isNew && slugId(draft.name) === "") problems.set("name", "Enter a name for the Account.")
	if (parseBps(draft.rate) === null) {
		problems.set("rate", "Enter a percent with at most two places, such as 3 or 3.50.")
	}
	const locked = draft.lockedUntil.trim()
	if (draft.kind === "asset" && locked !== "" && !isDateText(locked)) {
		problems.set("lockedUntil", "Enter the date as YYYY-MM-DD, or leave it empty.")
	}
	return problems
}

/**
 * The Account a draft names. A new Account's id is made from its name; an existing one keeps its id and
 * the fields the form does not show. A lock is for an asset only, and an empty field is removed.
 */
export function accountFromDraft(
	draft: AccountDraft,
	options: { existing?: ScenarioAccount | undefined; taken: readonly string[] },
): AccountResult {
	const problems = problemsOf(draft, options.existing === undefined)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const parsed = scenarioAccount.safeParse(candidateOf(draft, options))
	if (!parsed.success) {
		return { ok: false, problems: { general: "The Account cannot be saved as it is." } }
	}
	return { ok: true, account: parsed.data }
}

/** The Account as the document will hold it: the form's fields over the Account's own, empty ones removed. */
function candidateOf(
	draft: AccountDraft,
	options: { existing?: ScenarioAccount | undefined; taken: readonly string[] },
): Record<string, unknown> {
	const locked = draft.lockedUntil.trim()
	return {
		...withoutKeys(options.existing ?? {}, ["rate", "compounding", "lockedUntil"]),
		id: options.existing?.id ?? uniqueId(slugId(draft.name), options.taken),
		kind: draft.kind,
		rate: parseBps(draft.rate),
		...(draft.compounding === "" ? {} : { compounding: draft.compounding }),
		...(draft.kind === "asset" && locked !== "" ? { lockedUntil: locked } : {}),
	}
}
