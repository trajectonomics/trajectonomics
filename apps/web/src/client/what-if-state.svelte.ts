import type { WhatIfAnswer } from "../lib/what-if/answer"
import { SerialReader } from "../lib/what-if/reads"
import { type Change, changesOf, hasChanges, type WhatIf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import { readWhatIf } from "./what-if-remote.js"

/** The state of the What-if session: its plan and changes, its last reads, and any question to the person. */
export class WhatIfState {
	whatIf = $state<WhatIf | null>(null)
	answer = $state<WhatIfAnswer | null>(null)
	error = $state<string | null>(null)
	/** The plan a person asked to switch to while changes were pending; null when none is asked. */
	asking = $state<string | null>(null)
	/** True from a change until its read has been answered: the debounce, then the read in flight. */
	private waiting = $state(false)
	private inFlight = $state(false)
	/** True while Apply or Save runs: the session is what was sent, so no change may be made until it answers. */
	saving = $state(false)
	timer: ReturnType<typeof setTimeout> | undefined
	/** The reads, one at a time: the server refuses a second with 409, so a newer state waits its turn. */
	private readonly reader = new SerialReader<WhatIf, WhatIfAnswer | string>({
		transport: (whatIf, isCurrent) => readWhatIf(whatIf, editSession.token, isCurrent),
		deliver: (reply) => this.receive(reply),
		onBusy: (busy) => {
			this.inFlight = busy
		},
	})

	/** Whether the session holds any change. */
	get active(): boolean {
		return this.whatIf !== null && hasChanges(this.whatIf)
	}

	/** Whether a read is pending or in flight. Keeping the session waits for it, so the server is not busy. */
	get reading(): boolean {
		return this.waiting || this.inFlight
	}

	/** The changes, as the bar lists them. */
	get changes(): Change[] {
		return this.whatIf === null ? [] : changesOf(this.whatIf)
	}

	/** Reads the session's four reads after the debounce, so a run of quick changes reads once. */
	read(debounceMs: number): void {
		clearTimeout(this.timer)
		this.reader.supersede()
		this.waiting = true
		this.timer = setTimeout(() => {
			this.waiting = false
			if (this.whatIf !== null) this.reader.request(this.whatIf)
		}, debounceMs)
	}

	/** The reply of the latest state: its reads, or the sentence of why they could not be had. */
	private receive(reply: WhatIfAnswer | string): void {
		this.answer = typeof reply === "string" ? null : reply
		this.error = typeof reply === "string" ? reply : reply.ok ? null : reply.error.message
	}

	/** Forgets the session: its changes, its reads, any question, and any reply still on its way. */
	end(): void {
		clearTimeout(this.timer)
		this.waiting = false
		this.reader.cancel()
		this.whatIf = null
		this.answer = null
		this.error = null
		this.asking = null
		editSession.clear()
	}
}
