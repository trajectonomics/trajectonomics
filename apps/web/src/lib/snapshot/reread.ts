/**
 * The two pure steps of a reread that changes only the allowance inputs ([ADR 0012](../../../docs/adr/0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)):
 * whether the Snapshot still stands on the ledger it was read from, and the Snapshot with its allowance reads swapped.
 */
import type { Read, Snapshot, SnapshotReads } from "../contract"
import type { AllowancePlan } from "./allowance-params"
import { readsOf } from "./reads"
import type { StageOneReads } from "./stage-one"

/**
 * The codes a caller may retry unchanged: `RETRYABLE_CODES` in `apps/cli/src/errors.ts`, and `traj_unavailable`,
 * which the Dashboard gives a read when `traj` cannot be run at all.
 */
const RETRYABLE: readonly string[] = ["database_busy", "disk_full", "traj_unavailable"]

/** Whether two reads are the same read: the same argv and the same answer, down to each field. */
function same(a: Read<unknown>, b: Read<unknown>): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Whether the Snapshot still holds what the ledger says now: the plan list (each plan's content hash and
 * update time), the accounts, and net worth at the As-of, read again. Any difference means a plan or the ledger
 * changed since the Snapshot was read, and no kept Read can be trusted. A kept Read that failed with a retryable
 * code is not trusted either, so the whole Plan runs again. The allowance Reads are not kept Reads: they are the
 * ones a reread runs again, so their answers do not count here.
 */
export function stillCurrent(held: Snapshot, one: StageOneReads): boolean {
	const { reads } = held
	const allowances = new Set<Read<unknown>>(Object.values(reads.allowances))
	const kept = readsOf(held).filter((read) => !allowances.has(read))
	return (
		same(reads.scenarios, one.scenarios) &&
		same(reads.accounts, one.accounts) &&
		same(reads.netWorth, one.netWorth) &&
		!kept.some((read) => !read.ok && RETRYABLE.includes(read.error.code))
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
