import type { ScenarioAccount, ScenarioDocument } from "../../contract"
import { parseBps } from "../../format/bps"
import { feeFromDraft } from "../plan-items/account-income-save"
import { withoutKeys } from "../plan-items/form"
import type { Problems } from "../plan-items/problems"
import { type AccountText, type AssumptionsDraft, fieldKey } from "./draft"

/** The outcome of saving the page: the document to write, or the problems at its fields. */
export type AssumptionsResult =
	| { ok: true; document: ScenarioDocument }
	| { ok: false; problems: Problems }

const PERCENT = "Enter a percent with at most two places, such as 3 or 3.50."

/** The percent a field holds as basis points, or a problem. An empty field is `null` when it may be empty. */
function bpsOf(text: string, canBeEmpty: boolean): number | null | "problem" {
	if (canBeEmpty && text.trim() === "") return null
	const bps = parseBps(text)
	return bps === null ? "problem" : bps
}

/** The fee a row states, or its problems at the row's own fee fields (the Account form's rules, `feeFromDraft`). */
function feeWith(account: ScenarioAccount, text: AccountText, problems: Record<string, string>) {
	const fee = feeFromDraft(text.fee)
	for (const [field, message] of Object.entries(fee.problems)) {
		problems[fieldKey(field === "feeRate" ? "feeRate" : "feeRounding", account.id)] = message
	}
	return fee.fee === null ? {} : { fee: fee.fee }
}

/**
 * An asset Account as the page states it: its return, and for a liquid asset its volatility and fee when their text is not
 * empty. An illiquid asset keeps what it holds besides its return.
 */
function accountWith(
	account: ScenarioAccount,
	text: AccountText | undefined,
	problems: Record<string, string>,
): ScenarioAccount {
	if (text === undefined) return account
	const rate = bpsOf(text.rate, false)
	if (rate === "problem" || rate === null) problems[fieldKey("rate", account.id)] = PERCENT
	const stated = typeof rate === "number" ? rate : account.rate
	if (account.liquid === false) return { ...account, rate: stated }
	const swing = bpsOf(text.volatility, true)
	if (swing === "problem") problems[fieldKey("volatility", account.id)] = PERCENT
	return {
		...withoutKeys(account, ["rate", "volatility", "fee"]),
		id: account.id,
		kind: account.kind,
		rate: stated,
		...(typeof swing === "number" ? { volatility: swing } : {}),
		...feeWith(account, text, problems),
	}
}

/**
 * The document a draft states: the plan's own over the page's text, which only moves digits. The rates are text shaped for
 * `traj` (basis points); whether a value is allowed is `traj`'s to say, so a range is not checked here. A volatility left empty is
 * removed. The inflation is required, because the sim reads it: an empty field is a problem at the page.
 */
export function documentFromDraft(
	doc: ScenarioDocument,
	draft: AssumptionsDraft,
): AssumptionsResult {
	const problems: Record<string, string> = {}
	const accounts = doc.accounts.map((account) =>
		account.kind === "asset"
			? accountWith(
					account,
					draft.accounts.find((row) => row.id === account.id),
					problems,
				)
			: account,
	)
	const inflation = bpsOf(draft.inflation, false)
	if (inflation === "problem" || inflation === null) problems["inflation"] = PERCENT
	if (typeof inflation !== "number" || Object.keys(problems).length > 0) {
		return { ok: false, problems }
	}
	return { ok: true, document: { ...doc, accounts, economy: { ...doc.economy, inflation } } }
}
