import type { WhatIfAnswer } from "../lib/what-if/answer"
import type { WhatIf } from "../lib/what-if/session"
import { NO_EDIT_CLIENT } from "./edit-post"

/** A What-if read needs the server's `traj`. The hosted build has none: the sentence says so, and nothing is sent. */
export function readWhatIf(
	_whatIf: WhatIf,
	_token: string | null,
	_isCurrent: () => boolean,
): Promise<WhatIfAnswer | string> {
	return Promise.resolve(NO_EDIT_CLIENT)
}

/** Saving a What-if session as a plan is an Edit: refused. */
export function keepWhatIf(_whatIf: WhatIf, _name: string): Promise<boolean> {
	return Promise.resolve(false)
}

/** Applying a What-if session is an Edit: refused. */
export function applyWhatIf(_whatIf: WhatIf): Promise<boolean> {
	return Promise.resolve(false)
}
