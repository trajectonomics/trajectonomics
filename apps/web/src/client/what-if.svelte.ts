import { documentRead } from "../lib/view/plan-items/document"
import { editSession } from "./edit.svelte.js"
import { currentSnapshot } from "./snapshot.svelte.js"
import { WhatIfChanges } from "./what-if-changes.svelte.js"
import { applyWhatIf, keepWhatIf } from "./what-if-remote.js"

/** The What-if session of this tab, and how it ends. Nothing is stored: closing the tab ends it. */
class WhatIfSession extends WhatIfChanges {
	/** Drops the session with nothing run. */
	revert(): void {
		this.end()
	}

	/** Saves the session as a new plan. The session ends when the Edit ran. */
	async keepAsPlan(name: string): Promise<boolean> {
		if (this.whatIf === null || !this.active || this.reading) return false
		const ran = await keepWhatIf(this.whatIf, name)
		if (ran) this.end()
		return ran
	}

	/** Applies the session to its plan. The session ends when the Edit ran. */
	async applyToPlan(): Promise<boolean> {
		if (this.whatIf === null || !this.active || this.reading) return false
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
}

/** The one What-if session of the page. */
export const whatIfSession = new WhatIfSession()
