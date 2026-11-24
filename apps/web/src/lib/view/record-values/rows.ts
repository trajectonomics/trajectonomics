import type { Snapshot } from "../../contract"
import { accountGroups, type ListedAccount } from "../ledger/account-tree"
import { type GroupKey, groupOf } from "./groups"
import type { SheetRow } from "./types"

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

/** The names of an account and then its parents, nearest first. */
function namesUp(account: ListedAccount, byId: ReadonlyMap<string, ListedAccount>): string[] {
	const names: string[] = []
	const seen = new Set<string>()
	for (let at: ListedAccount | undefined = account; at && !seen.has(at.id); ) {
		seen.add(at.id)
		names.push(at.name)
		at = at.parentId === null ? undefined : byId.get(at.parentId)
	}
	return names
}

/** An account whose value can be stated: an asset or a liability. */
function hasValue(
	account: ListedAccount,
): account is ListedAccount & { type: "asset" | "liability" } {
	return account.type === "asset" || account.type === "liability"
}

/** The open asset and liability Leaf Accounts as rows, grouped by `groupOf`, in the order of the account tree. */
export function rowsByGroup(
	snapshot: Snapshot,
	listed: readonly ListedAccount[],
): Map<GroupKey, SheetRow[]> {
	const { balance } = snapshot.reads
	const byId = new Map(listed.map((account) => [account.id, account]))
	const balances = new Map(
		(balance.ok ? balance.data.rows : []).map((row) => [row.account.id, row.amount]),
	)
	const dates = lastDates(snapshot)
	const rowsOf = new Map<GroupKey, SheetRow[]>()
	for (const node of accountGroups(listed, []).flatMap((group) => group.nodes)) {
		const account = byId.get(node.id)
		if (account === undefined || !node.leaf || node.archived || !hasValue(account)) continue
		const key = groupOf(account.type, namesUp(account, byId))
		const row: SheetRow = {
			id: account.id,
			name: account.name,
			currency: account.currency,
			balance: balances.get(account.id) ?? null,
			lastDate: dates.get(account.id) ?? null,
			owed: account.type === "liability",
		}
		rowsOf.set(key, [...(rowsOf.get(key) ?? []), row])
	}
	return rowsOf
}
