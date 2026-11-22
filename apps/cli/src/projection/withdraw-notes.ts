import type { ProjectionRow, RunsOut, Scenario } from "@trajectonomics/core/sim"
import { moneyOf } from "./money"

/** An asset Account outside `cashflow.withdraw` and what it held on the day the run ran out. */
type Unlisted = { id: string; amount: number }

/**
 * The asset Accounts the engine could have drawn on at `runsOut.date` had `cashflow.withdraw`
 * listed them: unlocked, not listed, and holding money in the row the Projection keeps for that
 * date. The withdrawal step never touches an unlisted Account, so that row's balance is exactly
 * what it could have given.
 */
function unlistedAssets(
	document: Scenario,
	runsOut: RunsOut,
	rows: readonly ProjectionRow[],
): Unlisted[] {
	const listed = new Set(document.cashflow.withdraw)
	const held = new Map(
		(rows.find((row) => row.date === runsOut.date)?.balances ?? []).map((balance) => [
			balance.account,
			balance.amount,
		]),
	)
	return document.accounts
		.filter(
			(account) =>
				account.kind === "asset" &&
				!listed.has(account.id) &&
				(account.lockedUntil ?? runsOut.date) <= runsOut.date,
		)
		.map((account) => ({ id: account.id, amount: held.get(account.id) ?? 0 }))
		.filter((account) => account.amount > 0)
}

/**
 * The sentence a Projection that ran out of money adds when an asset Account holding money sits
 * outside `cashflow.withdraw`. Whatever the day's income cannot cover (an expense, a debt
 * Contribution, a tax Prepayment or Settlement) is paid from the withdraw list alone, so a
 * Scenario that lists none reports its tax as unmet even with cash in an Account (cli#147). The
 * sentence names each Account with what it held that day, so the reader can see whether adding
 * them would cover the unmet amount.
 */
export function withdrawNotes(
	document: Scenario,
	projection: { readonly runsOut?: RunsOut | undefined; readonly rows: readonly ProjectionRow[] },
	currency: string,
	side?: "A" | "B",
): string[] {
	const { runsOut, rows } = projection
	if (runsOut === undefined) return []
	const unlisted = unlistedAssets(document, runsOut, rows)
	if (unlisted.length === 0) return []
	const money = moneyOf(currency)
	const who = side === undefined ? "The Scenario" : `Side ${side}'s Scenario`
	const one = unlisted.length === 1
	const accounts = one ? "this asset Account was" : "these asset Accounts were"
	const named = unlisted.map((account) => `${account.id} (${money(account.amount)})`).join(", ")
	const list = JSON.stringify([...document.cashflow.withdraw, ...unlisted.map(({ id }) => id)])
	return [
		`${who} had ${money(runsOut.unmet)} unmet on ${runsOut.date}. Anything the day's income cannot cover is paid only from the Accounts in cashflow.withdraw, and ${accounts} not in it, holding on that day: ${named}. If the Scenario may draw on ${one ? "it" : "them"}, add ${one ? "it" : "them"} to cashflow.withdraw, for example --set 'cashflow.withdraw=${list}'.`,
	]
}
