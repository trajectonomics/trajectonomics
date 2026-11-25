import type { Snapshot } from "../../contract"
import { type AccountNames, accountNames } from "../account-names"
import type { ListedAccount } from "../ledger/account-tree"
import { periodOfRead } from "../ledger/transactions"
import { rowsByGroup } from "./rows"
import type { AgainstChoice, ValueSheet } from "./types"

export type { AgainstChoice, SheetGroup, SheetRow, ValueSheet } from "./types"

/** The exact command that makes an account the differences can count against. */
export function addAgainstCommand(currency: string): string {
	return `traj account add "Valuation gains" --type income --currency ${currency}`
}

/** The income and equity Leaf Accounts that are open: the ones a value's difference can count against. */
function againstChoices(listed: readonly ListedAccount[], names: AccountNames): AgainstChoice[] {
	const parents = new Set(listed.flatMap((account) => account.parentId ?? []))
	return listed
		.filter((a) => (a.type === "income" || a.type === "equity") && a.archivedAt === null)
		.filter((a) => !parents.has(a.id))
		.map((a) => ({ id: a.id, name: names.get(a.id) ?? a.name, currency: a.currency }))
}

/**
 * The sheet of one Snapshot: every open asset and liability Leaf Account, grouped, with the CLI's last Balance
 * and the date of its last Transaction. Null when the Snapshot holds no chart of accounts to build it from.
 */
export function valueSheet(snapshot: Snapshot): ValueSheet | null {
	const { accounts, transactions } = snapshot.reads
	if (!accounts.ok) return null
	const names = accountNames(accounts)
	const groups = rowsByGroup(snapshot, accounts.data.accounts, names)
	const choices = againstChoices(accounts.data.accounts, names)
	const currencies = [...new Set(groups.flatMap((group) => group.rows.map((row) => row.currency)))]
	return {
		asOf: snapshot.params.asOf,
		groups,
		choices,
		addCommands: choices.length > 0 ? [] : currencies.map(addAgainstCommand),
		since: transactions.ok ? periodOfRead(transactions.argv).since : null,
	}
}
