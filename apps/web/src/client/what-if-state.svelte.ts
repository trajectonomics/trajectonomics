import type { WhatIfAnswer } from "../lib/what-if/answer"
import { type Change, changesOf, hasChanges, type WhatIf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"

/** The state of the What-if session: its plan and changes, its last reads, and any question to the person. */
export class WhatIfState {
	whatIf = $state<WhatIf | null>(null)
	answer = $state<WhatIfAnswer | null>(null)
	error = $state<string | null>(null)
	/** The plan a person asked to switch to while changes were pending; null when none is asked. */
	asking = $state<string | null>(null)
	/** Counts the reads asked, so a reply for an older state of the session is dropped. */
	seq = 0
	timer: ReturnType<typeof setTimeout> | undefined

	/** Whether the session holds any change. */
	get active(): boolean {
		return this.whatIf !== null && hasChanges(this.whatIf)
	}

	/** The changes, as the bar lists them. */
	get changes(): Change[] {
		return this.whatIf === null ? [] : changesOf(this.whatIf)
	}

	/** Forgets the session: its changes, its reads, any question, and any reply still on its way. */
	end(): void {
		clearTimeout(this.timer)
		this.seq++
		this.whatIf = null
		this.answer = null
		this.error = null
		this.asking = null
		editSession.clear()
	}
}
