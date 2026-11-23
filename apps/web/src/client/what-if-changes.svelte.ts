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
	withoutSet,
	withSet,
} from "../lib/what-if/session"
import { WhatIfState } from "./what-if-state.svelte.js"

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
	 * a change to another plan while this one holds changes is refused and asks first. True when it was made.
	 */
	setOff(plan: string, contentHash: string, path: string, off: boolean): boolean {
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
		const base = this.sessionFor(plan, contentHash)
		if (base === null) return []
		let next = base
		for (const set of itemSets(list, id, stored, edited)) next = withSet(next, set.path, set.value)
		if (next !== base) this.keep(next)
		return clearedFields(stored, edited)
	}

	/** Takes one change out of the session. The session ends when none is left. */
	removeChange(change: Change): void {
		if (this.whatIf === null) return
		this.keep(
			change.kind === "off"
				? switchedOn(this.whatIf, change.path)
				: withoutSet(this.whatIf, change.path),
		)
	}

	/** A plan switch while changes are pending asks first. Returns true when the switch may run now. */
	requestSwitch(name: string): boolean {
		if (!this.active || this.whatIf?.plan === name) return true
		this.asking = name
		return false
	}

	/** Drops the pending changes and returns the plan that was asked for, for the caller to switch to. */
	revertAndSwitch(): string | null {
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
