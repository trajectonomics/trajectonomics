import type { PreviewAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"

/** The sentence every refused request of the hosted build answers with. */
export const NO_EDIT_CLIENT =
	"The hosted Demo cannot change a plan. Install traj and run traj dashboard to edit your own."

/** The loopback client posts one Edit. The hosted build has no such client: it sends nothing and rejects. */
export function postEdit(_token: string, _edit: EditInput): Promise<unknown> {
	return Promise.reject(new Error(NO_EDIT_CLIENT))
}

/** A preview that could not run, as the error envelope the page already shows. Nothing is sent. */
export function postPreview(_token: string, _edit: EditInput): Promise<PreviewAnswer> {
	return Promise.resolve({
		ok: false,
		error: { code: "unreachable", exitCode: 1, message: NO_EDIT_CLIENT },
	})
}
