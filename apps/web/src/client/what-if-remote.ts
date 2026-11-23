// The requests a What-if session makes: a read of its four reads, and the two Edits that keep it. Browser access
// is here, in src/client, and nowhere in the pure model ([web ADR 0009](../../docs/adr/0009-the-what-if-session-reads-through-traj-on-loopback.md)).
import { EDIT_TOKEN_HEADER, WHAT_IF_PATH } from "../lib/edit/guard"
import { type WhatIfAnswer, whatIfAnswer } from "../lib/what-if/answer"
import { overridesOf, type WhatIf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"

/** The sentence the bar shows when the reads cannot be had: the server did not answer, or said nothing usable. */
const UNREACHABLE = "The Dashboard could not reach traj. Try again."
const UNREADABLE = "The Dashboard could not read the answer to the what-if."
const BUSY = "The Dashboard is busy with another request. Change the what-if again to read it."

/** How many times a read answered 409 (another Edit or what-if runs on the server) is asked again, and after how long. */
const BUSY_RETRIES = 2
const BUSY_WAIT_MS = 400

/** One `POST /what-if`: the parsed answer, the sentence of why there is none, or `"busy"` for a 409. */
async function postOnce(whatIf: WhatIf, token: string): Promise<WhatIfAnswer | string | "busy"> {
	try {
		const response = await fetch(WHAT_IF_PATH, {
			method: "POST",
			headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
			body: JSON.stringify({ plan: whatIf.plan, ...overridesOf(whatIf) }),
			cache: "no-store",
		})
		if (response.status === 409) return "busy"
		const parsed = whatIfAnswer.safeParse(await response.json())
		return parsed.success ? parsed.data : UNREADABLE
	} catch {
		return UNREACHABLE
	}
}

/**
 * Posts the session's Overrides to `POST /what-if` and parses the answer; a 409 is asked again after a wait.
 * A state that a newer one replaced is not asked again, because its reply would be dropped.
 */
async function postWhatIf(
	whatIf: WhatIf,
	token: string,
	isCurrent: () => boolean,
): Promise<WhatIfAnswer | string> {
	for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
		const reply = await postOnce(whatIf, token)
		if (reply !== "busy") return reply
		if (attempt === BUSY_RETRIES || !isCurrent()) break
		await new Promise((resolve) => setTimeout(resolve, BUSY_WAIT_MS))
		if (!isCurrent()) break
	}
	return BUSY
}

/** Asks the server for the four reads of one state of the session. */
export function readWhatIf(
	whatIf: WhatIf,
	token: string | null,
	isCurrent: () => boolean,
): Promise<WhatIfAnswer | string> {
	return token === null ? Promise.resolve(UNREACHABLE) : postWhatIf(whatIf, token, isCurrent)
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
