import type { AccountList, AccountType, AmountRow } from "../../contract"

/** The five account types, in the order the Ledger lists them. */
export const ACCOUNT_TYPES: readonly AccountType[] = [
	"asset",
	"liability",
	"equity",
	"income",
	"expense",
]

/** An account as the chart of accounts lists it. */
export type ListedAccount = AccountList["accounts"][number]

/** One balance line of an account at the As-of, exactly as the CLI states it. */
export interface BalanceLine {
	readonly currency: string
	readonly amount: string
}

/** One row of the account tree: an account at its depth, with a balance only when it is a leaf. */
export interface AccountNode {
	readonly id: string
	readonly name: string
	readonly depth: number
	readonly archived: boolean
	/** A Leaf Account is one no other account names as its parent. */
	readonly leaf: boolean
	/** A leaf's balance lines. A parent has none, and so does a leaf the CLI gave no row for. */
	readonly balances: readonly BalanceLine[]
}

/** The accounts of one type, as a tree in the order the CLI lists them. */
export interface AccountGroup {
	readonly type: AccountType
	readonly nodes: readonly AccountNode[]
}

/**
 * The chart of accounts as groups by type, each a depth-first tree. A parent takes no amount of
 * its own and nothing is summed, so every figure is one the CLI printed. Empty types are left out.
 */
export function accountGroups(
	accounts: readonly ListedAccount[],
	rows: readonly AmountRow[],
): AccountGroup[] {
	const parents = new Set(accounts.flatMap((account) => account.parentId ?? []))
	const lines = balanceLines(rows)
	return ACCOUNT_TYPES.map((type) => ({
		type,
		nodes: treeOf(
			accounts.filter((account) => account.type === type),
			parents,
			lines,
		),
	})).filter((group) => group.nodes.length > 0)
}

function balanceLines(rows: readonly AmountRow[]): Map<string, BalanceLine[]> {
	const byAccount = new Map<string, BalanceLine[]>()
	for (const row of rows) {
		const lines = byAccount.get(row.account.id) ?? []
		lines.push({ currency: row.currency, amount: row.amount })
		byAccount.set(row.account.id, lines)
	}
	return byAccount
}

/** One type's accounts as a tree. An account whose parent is not in the type becomes a root. */
function treeOf(
	accounts: readonly ListedAccount[],
	parents: ReadonlySet<string>,
	lines: ReadonlyMap<string, readonly BalanceLine[]>,
): AccountNode[] {
	const ids = new Set(accounts.map((account) => account.id))
	const childrenOf = new Map<string, ListedAccount[]>()
	for (const account of accounts) {
		if (account.parentId === null || !ids.has(account.parentId)) continue
		childrenOf.set(account.parentId, [...(childrenOf.get(account.parentId) ?? []), account])
	}
	const nodes: AccountNode[] = []
	const seen = new Set<string>()
	const visit = (account: ListedAccount, depth: number): void => {
		if (seen.has(account.id)) return
		seen.add(account.id)
		const leaf = !parents.has(account.id)
		nodes.push({
			id: account.id,
			name: account.name,
			depth,
			archived: account.archivedAt !== null,
			leaf,
			balances: leaf ? (lines.get(account.id) ?? []) : [],
		})
		for (const child of childrenOf.get(account.id) ?? []) visit(child, depth + 1)
	}
	for (const account of accounts) {
		if (account.parentId === null || !ids.has(account.parentId)) visit(account, 0)
	}
	// Accounts left over only exist in a parent cycle, which the CLI never writes; list them anyway.
	for (const account of accounts) visit(account, 0)
	return nodes
}
