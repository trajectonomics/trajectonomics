import type { AssumedItem, Snapshot } from "../../contract"
import { householdOf, type PersonName, personNames } from "../item-names"
import { flatClaimant } from "../tax-settings/flat-claims"
import { assumedGroups } from "./groups"
import type { AssumedGroup } from "./types"

/** One plan's list as the page draws it, and the hash a Keep names. */
export interface PlanAssumed {
	readonly items: readonly AssumedItem[]
	readonly groups: readonly AssumedGroup[]
	readonly contentHash: string
}

/** Whose claims the plan's flat tax keys are after a holder swap, so an allowance never says "your" of another's. */
function claimantOf(snapshot: Snapshot, plan: string): PersonName | null {
	const read = snapshot.reads.documents?.[plan]
	const profile = read?.ok === true ? read.data.scenario.tax : undefined
	if (profile === undefined || profile === null) return null
	const household = householdOf(snapshot, plan)
	return flatClaimant(profile, household, personNames(household))
}

/**
 * What the saved plan assumes, as its `scenario show` lists it. Null when it assumes nothing: the read failed,
 * the Snapshot holds none, or the Snapshot was saved before the list.
 */
export function planAssumed(
	snapshot: Snapshot,
	plan: string | null,
	search: string,
): PlanAssumed | null {
	if (plan === null) return null
	const read = snapshot.reads.documents?.[plan]
	if (read?.ok !== true) return null
	const { assumed: items = [], document, contentHash } = read.data.scenario
	const groups = assumedGroups(items, document, search, claimantOf(snapshot, plan))
	return groups.length === 0 ? null : { items, groups, contentHash }
}
