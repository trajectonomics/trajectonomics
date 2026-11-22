import type { Read, Snapshot } from "../contract"

/** Every Read a Snapshot holds, whatever its slot: the single reads, the history, each Scenario's. */
export function readsOf(document: Snapshot): Read<unknown>[] {
	const { reads } = document
	const single = [
		reads.doctor,
		reads.accounts,
		reads.balance,
		reads.netWorth,
		reads.pnl,
		reads.transactions,
		reads.baseline,
		reads.scenarios,
	]
	const maps = [
		...Object.values(reads.projections),
		...Object.values(reads.fi),
		...Object.values(reads.chance),
	]
	const compare = reads.compare === null ? [] : [reads.compare]
	return [...single, ...reads.netWorthHistory, ...maps, ...compare]
}
