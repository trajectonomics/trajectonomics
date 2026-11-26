import type { Json } from "../lib/what-if/overrides"
import {
	clearedFields,
	type GroupSpec,
	groupId,
	isGroupOff,
	itemSets,
	withGroupOff,
	withGroupTried,
	withoutGroup,
} from "../lib/what-if/session"
import { WhatIfChanges } from "./what-if-changes.svelte.js"

/** One part of a group a form edited: its list and id, as the plan stores it and as the form made it. */
export type GroupPart = {
	readonly list: string
	readonly id: string
	readonly stored: Record<string, Json>
	readonly edited: Record<string, Json>
}

/** The loans and real assets a What-if session changes as a whole: their parts switch and try together. */
export class WhatIfGroups extends WhatIfChanges {
	/** Whether a loan's or an asset's parts are switched off together in this plan's session. */
	isGroupOffIn(plan: string, spec: GroupSpec): boolean {
		return (
			this.whatIf !== null && this.whatIf.plan === plan && isGroupOff(this.whatIf, groupId(spec))
		)
	}

	/**
	 * Switches a loan or an asset off or back on as one group: `removals` are its parts that leave the plan together,
	 * and a try of it is replaced. True when it was made (the rules of `setOff`).
	 */
	setGroupOff(
		plan: string,
		contentHash: string,
		spec: GroupSpec,
		removals: readonly string[],
		off: boolean,
	): boolean {
		if (this.saving) return false
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return false
		// On takes the group back, and keeps a Removal made before its switch: a share a try cleared stays cleared.
		this.keep(off ? withGroupOff(base, spec, removals) : withoutGroup(base, groupId(spec)))
		return true
	}

	/**
	 * Tries a loan's or an asset's edited parts as one change: the Sets of every part's changed fields, which replace
	 * any earlier try or switch of the group. Returns the fields the form cleared, which a what-if cannot try.
	 */
	tryGroup(
		plan: string,
		contentHash: string,
		spec: GroupSpec,
		parts: readonly GroupPart[],
	): string[] {
		if (this.saving) return []
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return []
		const sets = parts.flatMap((part) => itemSets(part.list, part.id, part.stored, part.edited))
		const cleared = parts.flatMap((part) => clearedFields(part.stored, part.edited))
		if (sets.length > 0 || this.whatIf !== null) this.keep(withGroupTried(base, spec, sets))
		return cleared
	}
}
