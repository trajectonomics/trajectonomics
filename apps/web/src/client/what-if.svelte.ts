import { documentRead } from "../lib/view/plan-items/document"
import type { WhatIf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import { currentSnapshot } from "./snapshot.svelte.js"
import { WhatIfGroups } from "./what-if-groups.svelte.js"
import { applyWhatIf, keepWhatIf } from "./what-if-remote.js"

/** The What-if session of this tab, and how it ends. Nothing is stored: closing the tab ends it. */
class WhatIfSession extends WhatIfGroups {
	/** Drops the session with nothing run. */
	revert(): void {
		if (!this.saving) this.end()
	}

	/** Saves the session as a new plan. The session ends when the Edit ran. */
	keepAsPlan(name: string): Promise<boolean> {
		return this.send((whatIf) => keepWhatIf(whatIf, name))
	}

	/** Applies the session to its plan. The session ends when the Edit ran. */
	applyToPlan(): Promise<boolean> {
		return this.send(applyWhatIf)
	}

	/**
	 * Sends the session as it is now. While the Edit runs the session takes no change (`saving`), so it is still
	 * exactly what was sent when the Edit answers, and ending it drops nothing the person saw. When the Edit did
	 * not run, the session stays and takes changes again.
	 */
	private async send(edit: (whatIf: WhatIf) => Promise<boolean>): Promise<boolean> {
		if (this.whatIf === null || !this.active || this.reading || this.saving) return false
		this.saving = true
		let ran = false
		try {
			ran = await edit(this.whatIf)
		} finally {
			this.saving = false
		}
		if (ran) this.end()
		return ran
	}

	/**
	 * After a refused apply over a plan that moved on: reads the Snapshot again and takes its hash for the plan,
	 * so the session applies over the new plan. The changes are kept. A read that fails again keeps the notice,
	 * so Reload can be tried again.
	 */
	async reload(): Promise<void> {
		const plan = this.whatIf?.plan
		if (!(await editSession.reread())) return
		const read = plan === undefined ? undefined : documentRead(currentSnapshot(), plan)
		if (this.whatIf !== null && read?.ok) {
			this.whatIf = { ...this.whatIf, contentHash: read.data.scenario.contentHash }
		}
		editSession.clear()
	}
}

/** The one What-if session of the page. */
export const whatIfSession = new WhatIfSession()
