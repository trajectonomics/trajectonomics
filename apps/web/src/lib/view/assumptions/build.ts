import type { ScenarioAccount, ScenarioDocument } from "../../contract"
import { parseBps } from "../../format/bps"
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

/** An asset Account as the page states it: its return, and its volatility when it has the field and the text is not empty. */
function accountWith(
	account: ScenarioAccount,
	text: AccountText | undefined,
	problems: Record<string, string>,
): ScenarioAccount {
	if (text === undefined) return account
	const rate = bpsOf(text.rate, false)
	if (rate === "problem" || rate === null) problems[fieldKey("rate", account.id)] = PERCENT
	if (account.liquid === false)
		return rate === "problem" || rate === null ? account : { ...account, rate }
	const swing = bpsOf(text.volatility, true)
	if (swing === "problem") problems[fieldKey("volatility", account.id)] = PERCENT
	const kept = withoutKeys(account, ["rate", "volatility"])
	return {
		...kept,
		id: account.id,
		kind: account.kind,
		rate: typeof rate === "number" ? rate : account.rate,
		...(typeof swing === "number" ? { volatility: swing } : {}),
	}
}

/**
 * The document a draft states: the plan's own over the page's text, which only moves digits. The rates are text shaped for
 * `traj` (basis points); whether a value is allowed is `traj`'s to say, so a range is not checked here. A volatility left empty is
 * removed, and an inflation left empty takes the `economy` block out.
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
	const inflation = bpsOf(draft.inflation, true)
	if (inflation === "problem") problems["inflation"] = PERCENT
	if (inflation === "problem" || Object.keys(problems).length > 0) return { ok: false, problems }
	const { economy: _stored, ...rest } = doc
	return {
		ok: true,
		document: { ...rest, accounts, ...(inflation === null ? {} : { economy: { inflation } }) },
	}
}
