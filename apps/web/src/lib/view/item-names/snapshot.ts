import type { HouseholdDocument, Snapshot } from "../../contract"
import { accountNames } from "../account-names"
import { type ItemNames, itemNames } from "./names"
import { type PersonNames, personNames } from "./people"

/** The household the Snapshot holds for a plan: its `scenario show` Read states it, or null when it has none or failed. */
export function householdOf(snapshot: Snapshot, plan: string | null): HouseholdDocument | null {
	// A Snapshot saved before the planner pages has no `documents`, which the loader reads as none.
	const read = plan === null ? undefined : snapshot.reads.documents?.[plan]
	return read?.ok === true ? read.data.scenario.household : null
}

/** The words for each of `names`' people, from the household the Snapshot holds for that plan (none shows every id). */
export function snapshotPeople(
	snapshot: Snapshot,
	names: readonly string[],
): Record<string, PersonNames> {
	return Object.fromEntries(names.map((name) => [name, personNames(householdOf(snapshot, name))]))
}

/** The lookup of one plan, built from the Snapshot's accounts Read and that plan's household, and from nothing else. */
export function snapshotItemNames(snapshot: Snapshot, plan: string | null): ItemNames {
	return itemNames(accountNames(snapshot.reads.accounts), householdOf(snapshot, plan))
}
