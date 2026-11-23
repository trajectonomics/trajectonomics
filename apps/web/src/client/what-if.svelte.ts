import { documentRead } from "../lib/view/plan-items/document"
import type { Json } from "../lib/what-if/overrides"
import {
	type Change,
	itemSets,
	startWhatIf,
	switchedOff,
	switchedOn,
	withoutSet,
	withSet,
} from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import { currentSnapshot } from "./snapshot.svelte.js"
import { applyWhatIf, keepWhatIf, readInto } from "./what-if-remote.js"
import { WhatIfState } from "./what-if-state.svelte.js"

/** How long the session waits after a change before it reads the what-if again. */
const DEBOUNCE_MS = 250

/** The What-if session of this tab. Nothing is stored: closing the tab ends it. */
class WhatIfSession extends WhatIfState {
	/** Switches an item off or back on, by its path (`flows.gym`, `accounts.cash`). */
	setOff(plan: string, contentHash: string, path: string, off: boolean): void {
		const base = this.whatIf ?? startWhatIf(plan, contentHash)
		this.whatIf = off ? switchedOff(base, path) : switchedOn(base, path)
		this.changed()
	}

	/** Makes the Sets of an edited item, one per changed field: the drawer's "Try a value". */
	tryItem(
		plan: string,
		contentHash: string,
		list: string,
		id: string,
		stored: Record<string, Json>,
		edited: Record<string, Json>,
	): void {
		let next = this.whatIf ?? startWhatIf(plan, contentHash)
		for (const set of itemSets(list, id, stored, edited)) next = withSet(next, set.path, set.value)
		this.whatIf = next
		this.changed()
	}

	/** Takes one change out of the session. The session ends when none is left. */
	removeChange(change: Change): void {
		if (this.whatIf === null) return
		this.whatIf =
			change.kind === "off"
				? switchedOn(this.whatIf, change.path)
				: withoutSet(this.whatIf, change.path)
		if (this.active) this.changed()
		else this.end()
	}

	/** Drops the session with nothing run. */
	revert(): void {
		this.end()
	}

	/** Saves the session as a new plan. The session ends when the Edit ran. */
	async keepAsPlan(name: string): Promise<boolean> {
		if (this.whatIf === null) return false
		const ran = await keepWhatIf(this.whatIf, name)
		if (ran) this.end()
		return ran
	}

	/** Applies the session to its plan. The session ends when the Edit ran. */
	async applyToPlan(): Promise<boolean> {
		if (this.whatIf === null) return false
		const ran = await applyWhatIf(this.whatIf)
		if (ran) this.end()
		return ran
	}

	/**
	 * After a refused apply over a plan that moved on: reads the Snapshot again and takes its hash for the plan,
	 * so the session applies over the new plan. The changes are kept.
	 */
	async reload(): Promise<void> {
		const plan = this.whatIf?.plan
		await editSession.reread()
		const read = plan === undefined ? undefined : documentRead(currentSnapshot(), plan)
		if (this.whatIf !== null && read?.ok) {
			this.whatIf = { ...this.whatIf, contentHash: read.data.scenario.contentHash }
		}
		editSession.clear()
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

	/** Asks the four reads again after the debounce, so a run of quick changes reads once. */
	private changed(): void {
		clearTimeout(this.timer)
		this.timer = setTimeout(() => void readInto(this), DEBOUNCE_MS)
	}
}

/** The one What-if session of the page. */
export const whatIfSession = new WhatIfSession()
