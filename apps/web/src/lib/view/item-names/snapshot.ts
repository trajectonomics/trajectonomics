import type { HouseholdDocument, ScenarioDocument, Snapshot } from "../../contract"
import { accountNames } from "../account-names"
import { type ItemNames, itemNames } from "./names"

/** The household the Snapshot holds for a plan: its `scenario show` Read states it, or null when it has none or failed. */
export function householdOf(snapshot: Snapshot, plan: string | null): HouseholdDocument | null {
	// A Snapshot saved before the planner pages has no `documents`, which the loader reads as none.
	const read = plan === null ? undefined : snapshot.reads.documents?.[plan]
	return read?.ok === true ? read.data.scenario.household : null
}

/** The document the Snapshot holds for a plan, whose item labels the lookup reads, or null when it has none or failed. */
export function documentOf(snapshot: Snapshot, plan: string | null): ScenarioDocument | null {
	const read = plan === null ? undefined : snapshot.reads.documents?.[plan]
	return read?.ok === true ? read.data.scenario.document : null
}

/** The lookup of one plan, built from the Snapshot's accounts Read, that plan's household and its document. */
export function snapshotItemNames(snapshot: Snapshot, plan: string | null): ItemNames {
	return itemNames(
		accountNames(snapshot.reads.accounts),
		householdOf(snapshot, plan),
		documentOf(snapshot, plan),
	)
}
