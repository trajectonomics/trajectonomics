import { documentRead } from "../lib/view/plan-items/document"
import { employerShareIds } from "../lib/view/plan-items/employer"
import type { Addition } from "../lib/what-if/additions"
import type { WhatIfAnswer } from "../lib/what-if/answer"
import { type LensReads, lensFor, lensReadsOf, type WhatIfLens } from "../lib/what-if/lens"
import { SerialReader } from "../lib/what-if/reads"
import {
	type Change,
	changesOf,
	hasChanges,
	overridesOf,
	type WhatIf,
} from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import { currentSnapshot } from "./snapshot.svelte.js"
import { readWhatIf } from "./what-if-remote.js"

/** The state of the What-if session: its plan and changes, its last reads, and any question to the person. */
export class WhatIfState {
	whatIf = $state<WhatIf | null>(null)
	answer = $state<WhatIfAnswer | null>(null)
	/** The state of the session the answer was read for, and the answer's four reads parsed against the contract. */
	private answered = $state<WhatIf | null>(null)
	private reads = $state<LensReads | null>(null)
	error = $state<string | null>(null)
	/** The plan a person asked to switch to while changes were pending; null when none is asked. */
	asking = $state<string | null>(null)
	/** How many switches were refused so far. A request for the same plan again changes it, so the question comes back into view. */
	asks = $state(0)
	/** True from a change until its read has been answered: the debounce, then the read in flight. */
	private waiting = $state(false)
	private inFlight = $state(false)
	/** True while Apply or Save runs: the session is what was sent, so no change may be made until it answers. */
	saving = $state(false)
	timer: ReturnType<typeof setTimeout> | undefined
	/** The reads, one at a time: the server refuses a second with 409, so a newer state waits its turn. */
	private readonly reader = new SerialReader<WhatIf, WhatIfAnswer | string>({
		transport: (whatIf, isCurrent) => readWhatIf(whatIf, editSession.token, isCurrent),
		deliver: (reply, state) => this.receive(reply, state),
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

	/** A rename of the plan the session is on: it follows to the new name and keeps its changes; the hash and the reads are as they were (cli ADR 0071). */
	followRename(from: string, to: string): void {
		if (this.whatIf?.plan === from) this.whatIf = { ...this.whatIf, plan: to }
		if (this.asking === from) this.asking = to
	}

	/** The changes, as the bar lists them, with the plan's own employer shares read from its document. */
	get changes(): Change[] {
		if (this.whatIf === null) return []
		const read = documentRead(currentSnapshot(), this.whatIf.plan)
		const shares =
			read?.ok === true ? employerShareIds(read.data.scenario.document.flows) : new Set<string>()
		return changesOf(this.whatIf, shares)
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

	/**
	 * What a figure page on `plan` may show of the session: its reads, or null. Null on another plan (a page shows
	 * the session only on the plan it belongs to), with no change, and while the reads answer an earlier state.
	 */
	lensFor(plan: string): WhatIfLens | null {
		return lensFor(plan, this.whatIf, this.answered, this.reads)
	}

	/** The Sets, Removals and Additions of the session when it is open on `plan` and holds a change, else null. */
	changesFor(
		plan: string,
	): { sets: WhatIf["sets"]; removals: WhatIf["removals"]; additions: Addition[] } | null {
		if (this.whatIf === null || this.whatIf.plan !== plan || !this.active) return null
		return {
			sets: this.whatIf.sets,
			removals: this.whatIf.removals,
			additions: this.whatIf.additions,
		}
	}

	/**
	 * The Sets, Removals and Additions the session sends when it is open on `plan` and holds a change, else null. A
	 * report names these, because a held change did not produce the figures; the planner cards read `changesFor`,
	 * which holds them.
	 */
	sentChangesFor(plan: string): {
		sets: WhatIf["sets"]
		removals: WhatIf["removals"]
		additions: Addition[]
	} | null {
		if (this.whatIf === null || this.whatIf.plan !== plan || !this.active) return null
		return overridesOf(this.whatIf)
	}

	private receive(reply: WhatIfAnswer | string, state: WhatIf): void {
		this.answer = typeof reply === "string" ? null : reply
		this.answered = typeof reply === "string" ? null : state
		this.reads = typeof reply === "string" ? null : lensReadsOf(reply)
		this.error = typeof reply === "string" ? reply : reply.ok ? null : reply.error.message
	}

	/** Forgets the session: its changes, its reads, any question, and any reply still on its way. */
	end(): void {
		clearTimeout(this.timer)
		this.waiting = false
		this.reader.cancel()
		this.whatIf = null
		this.answer = null
		this.answered = null
		this.reads = null
		this.error = null
		this.asking = null
		editSession.clear()
	}
}
