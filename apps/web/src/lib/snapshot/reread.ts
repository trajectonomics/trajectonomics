/**
 * The two pure steps of a reread that changes only the allowance inputs ([ADR 0012](../../../docs/adr/0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)):
 * whether the Snapshot still stands on the ledger it was read from, and the Snapshot with its allowance reads swapped.
 */
import type { Read, Snapshot, SnapshotReads } from "../contract"
import type { AllowancePlan } from "./allowance-params"
import type { StageOneReads } from "./stage-one"

/** Whether two reads are the same read: the same argv and the same answer, down to each field. */
function same(a: Read<unknown>, b: Read<unknown>): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Whether the Snapshot still holds what the ledger says now: the plan list (each plan's content hash and
 * update time), the accounts, and net worth at the As-of, read again. Any difference means a plan or the ledger
 * changed since the Snapshot was read, and no kept Read can be trusted.
 */
export function stillCurrent(held: Snapshot, one: StageOneReads): boolean {
	const { reads } = held
	return (
		same(reads.scenarios, one.scenarios) &&
		same(reads.accounts, one.accounts) &&
		same(reads.netWorth, one.netWorth)
	)
}

/** The Snapshot with the new allowance inputs and the reads they gave; every other Read stays as it was. */
export function withAllowances(
	held: Snapshot,
	allowances: AllowancePlan | null,
	reads: SnapshotReads["allowances"],
): Snapshot {
	return {
		...held,
		params: { ...held.params, allowances },
		reads: { ...held.reads, allowances: reads },
	}
}
