import { type PreviewAnswer, previewAnswer, sessionAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"
import { EDIT_PATH, EDIT_SESSION_PATH, EDIT_TOKEN_HEADER } from "../lib/edit/guard"

/** Posts one Edit as the page does, and returns the answer's JSON; it throws when the server is not reached. */
export async function postEdit(token: string, edit: EditInput): Promise<unknown> {
	const response = await fetch(EDIT_PATH, {
		method: "POST",
		headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
		body: JSON.stringify(edit),
		cache: "no-store",
	})
	return response.json()
}

/** Asks the server for this page's session token; null when no server answers (`vite preview`). */
export async function fetchEditToken(): Promise<string | null> {
	try {
		const response = await fetch(EDIT_SESSION_PATH, { cache: "no-store" })
		const session = response.ok ? sessionAnswer.safeParse(await response.json()) : null
		return session?.success === true ? session.data.token : null
	} catch {
		return null
	}
}

/** A preview that could not run, as the error envelope the page already shows. */
function unreached(message: string): PreviewAnswer {
	return { ok: false, error: { code: "unreachable", exitCode: 1, message } }
}

/** Posts a `record-values` Edit with `preview`: the dry run's result, or the CLI's error, as data. Never throws. */
export async function postPreview(token: string, edit: EditInput): Promise<PreviewAnswer> {
	try {
		const answer = previewAnswer.safeParse(await postEdit(token, edit))
		return answer.success
			? answer.data
			: unreached("The Dashboard could not read the answer to the preview.")
	} catch {
		return unreached("The Dashboard could not reach traj. Try again.")
	}
}
