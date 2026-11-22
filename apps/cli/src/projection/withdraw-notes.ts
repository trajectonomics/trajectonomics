import type { RunsOut, Scenario } from "@trajectonomics/core/sim"
import { moneyOf } from "./money"

/** The asset Accounts the engine could draw on at `date` if `cashflow.withdraw` listed them. */
function unlistedAssets(document: Scenario, date: string): string[] {
	const listed = new Set(document.cashflow.withdraw)
	return document.accounts
		.filter((account) => account.kind === "asset" && !listed.has(account.id))
		.filter((account) => account.kind === "asset" && (account.lockedUntil ?? date) <= date)
		.map((account) => account.id)
}

/**
 * The sentence a Projection that ran out of money adds when an asset Account sits outside
 * `cashflow.withdraw`. The engine draws on the withdraw list alone, for an expense and for a tax
 * Settlement alike, so a Scenario that lists none reports its tax as unmet even with cash in an
 * Account (cli#147). The sentence names the Accounts and the change, and claims nothing about
 * their balances: the engine does not report which Account could have covered the shortfall.
 */
export function withdrawNotes(
	document: Scenario,
	runsOut: RunsOut | undefined,
	currency: string,
	side?: "A" | "B",
): string[] {
	if (runsOut === undefined) return []
	const ids = unlistedAssets(document, runsOut.date)
	if (ids.length === 0) return []
	const who = side === undefined ? "The Scenario" : `Side ${side}'s Scenario`
	const amount = moneyOf(currency)(runsOut.unmet)
	const accounts = ids.length === 1 ? "this asset Account is" : "these asset Accounts are"
	const list = JSON.stringify([...document.cashflow.withdraw, ...ids])
	return [
		`${who} had ${amount} unmet on ${runsOut.date}. Expenses and tax Settlements are paid only from the Accounts in cashflow.withdraw, and ${accounts} not in it: ${ids.join(", ")}. If the Scenario may draw on ${ids.length === 1 ? "it" : "them"}, add ${ids.length === 1 ? "it" : "them"} to cashflow.withdraw, for example --set 'cashflow.withdraw=${list}'.`,
	]
}
