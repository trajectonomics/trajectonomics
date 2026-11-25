import type { AllowancePlan } from "../lib/snapshot/allowance-params"
import type { ChanceInputs } from "../lib/snapshot/chance-params"
import { NO_EDIT_CLIENT } from "./edit-post"

/** The body of a reread, as the loopback client types it. */
export type RereadBody = {
	allowances?: AllowancePlan | null
	chance?: ChanceInputs
	addPlan?: string
}

/** The loopback client asks the server to read again. The hosted build has no server: it sends nothing. */
export function postReread(
	_token: string,
	_body: RereadBody,
): Promise<{ ok: true } | { ok: false; message: string }> {
	return Promise.resolve({ ok: false, message: NO_EDIT_CLIENT })
}
