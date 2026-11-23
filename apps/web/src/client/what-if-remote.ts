// The requests a What-if session makes: a read of its four reads, and the two Edits that keep it. Browser access
// is here, in src/client, and nowhere in the pure model ([web ADR 0009](../../docs/adr/0009-the-what-if-session-reads-through-traj-on-loopback.md)).
import { EDIT_TOKEN_HEADER, WHAT_IF_PATH } from "../lib/edit/guard"
import { type WhatIfAnswer, whatIfAnswer } from "../lib/what-if/answer"
import { overridesOf, type WhatIf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import type { WhatIfState } from "./what-if-state.svelte.js"

/** The sentence the bar shows when the reads cannot be had: the server did not answer, or said nothing usable. */
const UNREACHABLE = "The Dashboard could not reach traj. Try again."
const UNREADABLE = "The Dashboard could not read the answer to the what-if."

/** Posts the session's Overrides to `POST /what-if` and parses the answer. */
async function postWhatIf(whatIf: WhatIf, token: string): Promise<WhatIfAnswer | string> {
	try {
		const response = await fetch(WHAT_IF_PATH, {
			method: "POST",
			headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
			body: JSON.stringify({ plan: whatIf.plan, ...overridesOf(whatIf) }),
			cache: "no-store",
		})
		const parsed = whatIfAnswer.safeParse(await response.json())
		return parsed.success ? parsed.data : UNREADABLE
	} catch {
		return UNREACHABLE
	}
}

/** Reads the four reads of the session into its state. A reply for an older state of the session is dropped. */
export async function readInto(session: WhatIfState): Promise<void> {
	const whatIf = session.whatIf
	const token = editSession.token
	if (whatIf === null || token === null || !session.active) return
	const seq = ++session.seq
	const reply = await postWhatIf(whatIf, token)
	if (seq !== session.seq) return
	session.answer = typeof reply === "string" ? null : reply
	session.error = typeof reply === "string" ? reply : reply.ok ? null : reply.error.message
}

/** Saves the session as a new plan with its Overrides (`copy-plan`). True when the Edit ran. */
export function keepWhatIf(whatIf: WhatIf, name: string): Promise<boolean> {
	return editSession.run({ kind: "copy-plan", from: whatIf.plan, name, ...overridesOf(whatIf) })
}

/** Applies the session to its plan (`apply-overrides`), naming the hash the session began with. True when it ran. */
export function applyWhatIf(whatIf: WhatIf): Promise<boolean> {
	return editSession.run({
		kind: "apply-overrides",
		name: whatIf.plan,
		contentHash: whatIf.contentHash,
		...overridesOf(whatIf),
	})
}
