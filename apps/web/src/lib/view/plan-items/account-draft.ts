import { type ScenarioAccount, scenarioAccount } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import { type IncomeContext, NO_INCOME_CONTEXT } from "./account-income"
import { feeFromDraft, payoutFromDraft } from "./account-income-save"
import type { AccountDraft } from "./accounts"
import { isDateText, slugId, uniqueId, withoutKeys } from "./form"
import type { Problems } from "./problems"

/** The outcome of an Account form: the Account to save, or the problems it shows at its fields. */
export type AccountResult =
	| { ok: true; account: ScenarioAccount }
	| { ok: false; problems: Problems }

/** What an Account form is made against besides its draft: the Account's own id, the ids taken, and what a payout reads of the plan. */
interface Options {
	existing?: ScenarioAccount | undefined
	taken: readonly string[]
	income?: IncomeContext | undefined
}

/** Whether the form offers a payout and a fee: an asset that is not illiquid (`liquid: false`, a home or a car). */
export function offersIncome(kind: string, account: ScenarioAccount | undefined): boolean {
	return kind === "asset" && account?.liquid !== false
}

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
export function accountFromDraft(draft: AccountDraft, options: Options): AccountResult {
	const problems = new Map(problemsOf(draft, options.existing === undefined))
	const income = incomeOf(draft, options)
	for (const [field, text] of Object.entries(income.problems)) problems.set(field, text)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const parsed = scenarioAccount.safeParse({ ...candidateOf(draft, options), ...income.fields })
	if (!parsed.success) {
		return { ok: false, problems: { general: "The Account cannot be saved as it is." } }
	}
	return { ok: true, account: parsed.data }
}

/**
 * The payout and the fee the draft states, or its problems. A payout and a fee are an asset's only: a debt drops both, and an
 * illiquid asset keeps what it holds, which its form does not show.
 */
function incomeOf(
	draft: AccountDraft,
	options: Options,
): { fields: Record<string, unknown>; problems: Record<string, string> } {
	const { existing } = options
	if (!offersIncome(draft.kind, existing)) {
		const keep = draft.kind === "asset" && existing !== undefined
		return {
			fields: keep
				? {
						...(existing.payout && { payout: existing.payout }),
						...(existing.fee && { fee: existing.fee }),
					}
				: {},
			problems: {},
		}
	}
	const payout = payoutFromDraft(
		draft.payout,
		existing?.payout,
		options.income ?? NO_INCOME_CONTEXT,
	)
	const fee = feeFromDraft(draft.fee)
	return {
		fields: {
			...(payout.payout === null ? {} : { payout: payout.payout }),
			...(fee.fee === null ? {} : { fee: fee.fee }),
		},
		problems: { ...payout.problems, ...fee.problems },
	}
}

/** The Account as the document will hold it: the form's fields over the Account's own, empty ones removed. */
function candidateOf(draft: AccountDraft, options: Options): Record<string, unknown> {
	const locked = draft.lockedUntil.trim()
	return {
		...withoutKeys(options.existing ?? {}, ["rate", "compounding", "lockedUntil", "payout", "fee"]),
		id: options.existing?.id ?? uniqueId(slugId(draft.name), options.taken),
		kind: draft.kind,
		rate: parseBps(draft.rate),
		...(draft.compounding === "" ? {} : { compounding: draft.compounding }),
		...(draft.kind === "asset" && locked !== "" ? { lockedUntil: locked } : {}),
	}
}
