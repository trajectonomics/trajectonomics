import { entryAccount } from "../engine/routed"
import type { WithdrawEntry } from "../types"
import type { DrawnLine } from "../types/breakdown"

/**
 * One line per entry of `cashflow.withdraw` that drew money, in list order. A list with a Reserve floor
 * numbers its lines by position, since an Account may appear twice; a plain list is as it always was.
 */
export function drawnLines(
	withdraw: readonly WithdrawEntry[],
	sums: ReadonlyMap<string, bigint>,
): DrawnLine[] {
	const numbered = withdraw.some((entry) => typeof entry !== "string")
	const out: DrawnLine[] = []
	withdraw.forEach((entry, position) => {
		const amount = Number(sums.get(String(position)) ?? 0n)
		if (amount === 0) return
		const account = entryAccount(entry)
		out.push(numbered ? { account, amount, entry: position } : { account, amount })
	})
	return out
}
