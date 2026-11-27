/**
 * The `claimsHolder` each plan's stored tax profile records (cli ADR 0075), read from the Snapshot's `scenario show`.
 * The Tax, Tax allowances and Home pages pass it to `returnLabel`, so an id the household no longer names reads "The
 * earlier holder" there as it does in the Tax profile tables. Null when the plan has no document Read, no stored
 * profile, or records no holder. Pure.
 */
import type { Snapshot } from "../../contract"

/** The recorded `claimsHolder` of one plan, or null when its document Read states none. */
export function claimsHolderOf(snapshot: Snapshot, plan: string | null): string | null {
	const read = plan === null ? undefined : snapshot.reads.documents?.[plan]
	return read?.ok === true ? (read.data.scenario.tax?.claimsHolder ?? null) : null
}

/** Each plan's recorded `claimsHolder`, by name, for a page that shows several plans. */
export function snapshotClaimsHolders(
	snapshot: Snapshot,
	plans: readonly string[],
): Record<string, string | null> {
	return Object.fromEntries(plans.map((plan) => [plan, claimsHolderOf(snapshot, plan)]))
}
