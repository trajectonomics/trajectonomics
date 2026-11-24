import type { Snapshot } from "../../contract"
import { accountGroups, type ListedAccount } from "../ledger/account-tree"
import type { SheetGroup, SheetRow } from "./types"

/** The last Transaction date of each account in the loaded transactions. */
function lastDates(snapshot: Snapshot): Map<string, string> {
	const dates = new Map<string, string>()
	const read = snapshot.reads.transactions
	for (const tx of read.ok ? read.data.transactions : []) {
		for (const posting of tx.postings) {
			const seen = dates.get(posting.account.id)
			if (seen === undefined || tx.date > seen) dates.set(posting.account.id, tx.date)
		}
	}
	return dates
}

/** The top-most ancestor of an account in the ledger's own parent chain; the account itself when it has no parent. */
function rootOf(account: ListedAccount, byId: ReadonlyMap<string, ListedAccount>): ListedAccount {
	const seen = new Set<string>()
	let at = account
	while (!seen.has(at.id)) {
		seen.add(at.id)
		const parent = at.parentId === null ? undefined : byId.get(at.parentId)
		if (parent === undefined) return at
		at = parent
	}
	return at
}

/** The group of a row: every debt under "Debts", an asset under its top-level ancestor, or under "Assets" with none. */
function groupOf(
	account: ListedAccount,
	byId: ReadonlyMap<string, ListedAccount>,
): { key: string; title: string } {
	if (account.type === "liability") return { key: "debts", title: "Debts" }
	const root = rootOf(account, byId)
	return root.id === account.id
		? { key: "assets", title: "Assets" }
		: { key: root.id, title: root.name }
}

/** An account whose value can be stated: an asset or a liability. */
function hasValue(
	account: ListedAccount,
): account is ListedAccount & { type: "asset" | "liability" } {
	return account.type === "asset" || account.type === "liability"
}

/**
 * The open asset and liability Leaf Accounts as rows, grouped by the top-level account each sits under, in
 * the order the account tree lists them. The ledger's own names title the groups; the page reads no word in them.
 */
export function rowsByGroup(snapshot: Snapshot, listed: readonly ListedAccount[]): SheetGroup[] {
	const { balance } = snapshot.reads
	const byId = new Map(listed.map((account) => [account.id, account]))
	const balances = new Map(
		(balance.ok ? balance.data.rows : []).map((row) => [row.account.id, row.amount]),
	)
	const dates = lastDates(snapshot)
	const groups = new Map<string, { title: string; rows: SheetRow[] }>()
	for (const node of accountGroups(listed, []).flatMap((group) => group.nodes)) {
		const account = byId.get(node.id)
		if (account === undefined || !node.leaf || node.archived || !hasValue(account)) continue
		const { key, title } = groupOf(account, byId)
		const row: SheetRow = {
			id: account.id,
			name: account.name,
			currency: account.currency,
			balance: balances.get(account.id) ?? null,
			lastDate: dates.get(account.id) ?? null,
			owed: account.type === "liability",
		}
		const group = groups.get(key) ?? { title, rows: [] }
		group.rows.push(row)
		groups.set(key, group)
	}
	return [...groups].map(([key, { title, rows }]) => ({ key, title, rows }))
}
