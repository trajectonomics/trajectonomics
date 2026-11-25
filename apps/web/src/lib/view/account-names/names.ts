/**
 * The one lookup that turns an Account's id into the name the ledger gives it. It is built from the accounts Read
 * (`traj account list --json`) and from nothing else: a name the Snapshot does not hold is never made up, and the
 * caller shows the id as it is (`isNamed` says which). Pure: no figure is made here (web ADR 0002).
 *
 * The ledger keeps names unique (`account_name_taken`), so the parent path and the id tail below only guard a Snapshot
 * that breaks that: two Accounts of one name must still be told apart on a page.
 */
import type { AccountList, Read } from "../../contract"

/** The label of each Account the accounts Read holds, by its id, and by its name when no other Account has that name. */
export type AccountNames = ReadonlyMap<string, string>

/** The names of a page that has none: every id shows as it is. */
export const NO_NAMES: AccountNames = new Map()

/** How an Account's parents are joined to its name when two Accounts share it: "Savings, under Bank". */
export const PATH_SEPARATOR = " › "

/** The shortest id tail, in characters, that tells two Accounts of one name apart. */
const MIN_TAIL = 4

type Account = AccountList["accounts"][number]

/** The names from the top-level Account down to this one. A parent id the Read does not hold, or a loop, ends the path. */
function pathOf(account: Account, byId: ReadonlyMap<string, Account>): string[] {
	const path = [account.name]
	const seen = new Set([account.id])
	for (let up = account.parentId; up !== null && !seen.has(up); ) {
		const parent = byId.get(up)
		if (parent === undefined) break
		path.unshift(parent.name)
		seen.add(parent.id)
		up = parent.parentId
	}
	return path
}

/** The last `depth` names of a path, joined. A path shorter than `depth` is whole. */
function tail(path: readonly string[], depth: number): string {
	return path.slice(-depth).join(PATH_SEPARATOR)
}

/** The shortest id tail that is not another's in the same group, at least `MIN_TAIL` characters. */
function idTail(id: string, others: readonly string[]): string {
	for (let length = MIN_TAIL; length < id.length; length += 1) {
		const mine = id.slice(-length)
		if (!others.some((other) => other !== id && other.endsWith(mine))) return mine
	}
	return id
}

/**
 * The labels of Accounts that share one name: the name with as many parents as it takes to tell them apart, the
 * fewest that does. Accounts still equal under every parent take the tail of their id as well.
 */
function labelsOfGroup(group: readonly Account[], byId: ReadonlyMap<string, Account>) {
	const paths = group.map((account) => pathOf(account, byId))
	const longest = Math.max(...paths.map((path) => path.length))
	let depth = 1
	while (depth < longest && new Set(paths.map((path) => tail(path, depth))).size < group.length) {
		depth += 1
	}
	const labels = paths.map((path) => tail(path, depth))
	return group.map((account, at) => {
		const label = labels[at] ?? account.name
		const twins = group.filter((_, other) => labels[other] === label)
		if (twins.length === 1) return [account.id, label] as const
		const ids = twins.map((twin) => twin.id)
		return [account.id, `${label} (${idTail(account.id, ids)})`] as const
	})
}

/** The names a plan may hold an Account by instead of its id (the Baseline matches both): each one no other Account has. */
function uniqueNames(groups: ReadonlyMap<string, readonly Account[]>, ids: ReadonlySet<string>) {
	return [...groups.keys()].filter((name) => groups.get(name)?.length === 1 && !ids.has(name))
}

/** The names of the accounts Read, by id. Empty when the Read is missing or failed, so every id shows as it is. */
export function accountNames(read: Read<AccountList> | undefined): AccountNames {
	if (read?.ok !== true) return new Map()
	const accounts = read.data.accounts
	const byId = new Map(accounts.map((account) => [account.id, account]))
	const groups = new Map<string, Account[]>()
	for (const account of accounts) {
		groups.set(account.name, [...(groups.get(account.name) ?? []), account])
	}
	const names = new Map<string, string>()
	for (const group of groups.values()) {
		for (const [id, label] of labelsOfGroup(group, byId)) names.set(id, label)
	}
	for (const name of uniqueNames(groups, new Set(byId.keys()))) names.set(name, name)
	return names
}

/** Whether the ledger names this id, which is false for an Account only the plan has (a home the plan buys). */
export function isNamed(names: AccountNames, id: string): boolean {
	return names.has(id)
}

/** The label of an Account a result names (`{ id, name }`): the lookup's, else the name the result itself gives it. */
export function refLabel(
	names: AccountNames,
	ref: { readonly id: string; readonly name: string },
): string {
	return names.get(ref.id) ?? ref.name
}

/** The name of an Account, or its id when no name is known. */
export function nameOf(names: AccountNames, id: string): string {
	return names.get(id) ?? id
}
