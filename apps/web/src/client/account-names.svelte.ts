import type { AccountList, Read } from "../lib/contract"
import { type AccountNames, accountNames } from "../lib/view/account-names"
import { currentSnapshot } from "./snapshot.svelte"

const NONE: AccountNames = new Map()
const built = new WeakMap<Read<AccountList>, AccountNames>()

/**
 * The ledger names of the Snapshot this page shows, by Account id: the one lookup every page below the shell reads. It follows the
 * Snapshot, so a reread or an Edit's new Snapshot (which reads the accounts again) renames at once. With no ready Snapshot it is empty.
 */
export function currentAccountNames(): AccountNames {
	const state = currentSnapshot()
	if (state.status !== "ready") return NONE
	const read = state.snapshot.reads.accounts
	const held = built.get(read)
	if (held !== undefined) return held
	const names = accountNames(read)
	built.set(read, names)
	return names
}
