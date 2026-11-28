// GET /edit-session: the session token, to this machine's page only, and whether the served Snapshot lacks a
// write that landed, so a page loaded again says so ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { refuseSession } from "../src/lib/edit/guard"
import { refused } from "./serve-edit-answer"
import { json } from "./serve-respond"

/** What the answer states: the token the server made at start, and whether a landed write is unread. */
export type Session = { readonly token: string; readonly unread: boolean }

/** Refused over a wrong method or Host, or answered; `unread` is left out while it is false. */
export function answerSession(request: Request, port: number, session: Session): Response {
	const refusal = refuseSession({
		method: request.method,
		host: request.headers.get("host"),
		port,
	})
	if (refusal) return refused(refusal.status, refusal.code, refusal.message)
	const { token, unread } = session
	return json(200, JSON.stringify({ token, ...(unread ? { unread } : {}) }))
}
