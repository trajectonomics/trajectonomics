/**
 * The estate block a draft saves as (cli ADR 0064), in the decimal form `scenario show --decimal` prints and
 * `scenario apply --decimal` reads: a share as a percent string, a fixed amount in major units, a fixed line's growth as
 * `"inflation"` or `{ bps }` in whole basis points. Text is sent as typed once its shape is right; `traj` reads it.
 */
import { type EstateBlock, type EstateLine, estateBlock } from "../../contract"
import { parseBps } from "../../format/bps"
import { typedAmount } from "../plan-items/form"
import type { Problems } from "../plan-items/problems"
import { percentText } from "../withdrawals/check"
import { idOf, problemsOf } from "./check"
import type { EstateDraft, LineDraft, ListName } from "./draft"

/** The outcome of the form: the block to save (null when no line is left, so the plan states none), or its problems. */
export type EstateResult =
	| { ok: true; block: EstateBlock | null }
	| { ok: false; problems: Problems }

/** One line as the document holds it, for a draft that has passed its shape checks. */
function lineOf(line: LineDraft, list: ListName): EstateLine {
	const id = idOf(line)
	if (line.how === "share") {
		const of =
			list === "gifts" ? "net" : line.of === "gross" ? "gross" : { accounts: line.accounts }
		return {
			id,
			of,
			bps: percentText(line.share) ?? "",
			rounding: line.rounding as "floor" | "halfUp" | "ceil",
		}
	}
	const bps = parseBps(line.rate)
	return {
		id,
		amount: typedAmount(line.amount) ?? "",
		growth: line.growth === "fixed" && bps !== null ? { bps } : "inflation",
	}
}

/** The block a draft names: a list with no line is left out, and a block with no list is no block at all. */
export function blockFromDraft(draft: EstateDraft): EstateResult {
	const problems = problemsOf(draft)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const lists = (["costs", "gifts"] as const).flatMap((list) =>
		draft[list].length === 0
			? []
			: [[list, draft[list].map((line) => lineOf(line, list))] as const],
	)
	if (lists.length === 0) return { ok: true, block: null }
	const parsed = estateBlock.safeParse(Object.fromEntries(lists))
	if (!parsed.success)
		return { ok: false, problems: { general: "The estate cannot be saved as it is." } }
	return { ok: true, block: parsed.data }
}
