import type { Addition } from "../lib/what-if/additions"
import type { Json } from "../lib/what-if/overrides"
import {
	type Change,
	clearedFields,
	hasChanges,
	isOff,
	itemSets,
	startWhatIf,
	switchedOff,
	switchedOn,
	type WhatIf,
	withAddition,
	withoutAddition,
	withoutSet,
	withSet,
} from "../lib/what-if/session"
import { type TriedFlow, withTriedFlow } from "../lib/what-if/try-flow"
import { WhatIfState } from "./what-if-state.svelte.js"

/** The session without one change: a switch back on, an item not added, or a value back to the plan's. */
function without(whatIf: WhatIf, change: Change): WhatIf {
	if (change.kind === "off") return switchedOn(whatIf, change.path)
	if (change.kind === "add") return withoutAddition(whatIf, change.path)
	return withoutSet(whatIf, change.path)
}

/** How long the session waits after a change before it reads the what-if again. */
const DEBOUNCE_MS = 250

/** The changes a What-if session holds, and the plan they belong to: a change to another plan asks first. */
export class WhatIfChanges extends WhatIfState {
	/** Whether an item is switched off in this plan's session. A session on another plan switches nothing here. */
	isOffIn(plan: string, path: string): boolean {
		return this.whatIf !== null && this.whatIf.plan === plan && isOff(this.whatIf, path)
	}

	/**
	 * Switches an item off or back on, by its path (`flows.gym`, `accounts.cash`). A session belongs to one plan:
	 * a change to another plan while this one holds changes is refused and asks first, and so is any change
	 * while Apply or Save runs. True when it was made.
	 */
	setOff(plan: string, contentHash: string, path: string, off: boolean): boolean {
		if (this.saving) return false
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return false
		this.keep(off ? switchedOff(base, path) : switchedOn(base, path))
		return true
	}

	/**
	 * Makes the Sets of an edited item, one per changed field: the drawer's "Try a value". Returns the fields the
	 * form cleared, which a what-if cannot try, because `traj` replaces a path and cannot delete one.
	 */
	tryItem(
		plan: string,
		contentHash: string,
		list: string,
		id: string,
		stored: Record<string, Json>,
		edited: Record<string, Json>,
	): string[] {
		if (this.saving) return []
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return []
		let next = base
		for (const set of itemSets(list, id, stored, edited)) next = withSet(next, set.path, set.value)
		if (next !== base) this.keep(next)
		return clearedFields(stored, edited)
	}

	/** Tries a Flow in the session, replacing any earlier try of it (`withTriedFlow`). True when it was tried. */
	tryFlow(plan: string, contentHash: string, tried: TriedFlow): boolean {
		const base = this.saving ? null : this.sessionFor(plan, contentHash)
		if (base !== null) this.keep(withTriedFlow(base, tried))
		return base !== null
	}

	/**
	 * Puts new items on the plan in the session: the "Try as what-if" of a suggestion (cli ADR 0062). The same
	 * rules as a switch: another plan's pending changes ask first, and nothing changes while Apply or Save runs.
	 * True when they were added.
	 */
	addItems(plan: string, contentHash: string, additions: readonly Addition[]): boolean {
		if (this.saving || additions.length === 0) return false
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return false
		this.keep(additions.reduce(withAddition, base))
		return true
	}

	/** Takes one change out of the session. The session ends when none is left. Refused while Apply or Save runs. */
	removeChange(change: Change): void {
		if (this.whatIf === null || this.saving) return
		this.keep(without(this.whatIf, change))
	}

	/** A plan switch while changes are pending asks first. Returns true when the switch may run now. */
	requestSwitch(name: string): boolean {
		if (!this.active || this.whatIf?.plan === name) return true
		this.asking = name
		return false
	}

	/** Drops the pending changes and returns the plan that was asked for, for the caller to switch to. */
	revertAndSwitch(): string | null {
		if (this.saving) return null
		const name = this.asking
		this.end()
		return name
	}

	/** Keeps the changes on their plan: the question closes and nothing switches. */
	stay(): void {
		this.asking = null
	}

	/** The session a change to `plan` goes into: this one, a new one, or null when changes on another plan must be settled first. */
	private sessionFor(plan: string, contentHash: string): WhatIf | null {
		if (this.whatIf !== null && this.whatIf.plan === plan) return this.whatIf
		if (this.active) {
			this.asking = plan
			return null
		}
		return startWhatIf(plan, contentHash)
	}

	/** Holds the session after a change and reads it again; a session with no change left ends, on every path. */
	private keep(next: WhatIf): void {
		if (!hasChanges(next)) {
			this.end()
			return
		}
		this.whatIf = next
		this.asking = null
		this.read(DEBOUNCE_MS)
	}
}
