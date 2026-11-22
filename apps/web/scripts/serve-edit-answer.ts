// The answers of the write path that are not an Edit's own result: a refusal, and a body that is not an
// Edit of the list. Both are the error envelope every write answer uses ([serve-edit.ts](serve-edit.ts)).
import type { ErrorBody } from "../src/lib/contract"
import { type Edit, editSchema } from "../src/lib/edit/edit"
import { json } from "./serve-respond"

/** The exit code a refusal carries: the write path refuses rather than runs, so none of traj's codes fits. */
export const REFUSED_EXIT_CODE = 1

/** An error envelope at a status: a failed Edit answers 200, with its error as data. */
export function failure(status: number, error: ErrorBody): Response {
	return json(status, JSON.stringify({ ok: false, error }))
}

/** A refused request: its status, its code and the sentence a person reads. */
export function refused(status: number, code: string, message: string): Response {
	return failure(status, { code, exitCode: REFUSED_EXIT_CODE, message })
}

/** Reads the body as an Edit of the closed list: refused when it is not JSON, or names no Edit. */
export async function readEdit(
	request: Request,
): Promise<{ ok: true; edit: Edit } | { ok: false; error: ErrorBody }> {
	const invalid = (message: string) => ({
		ok: false as const,
		error: { code: "invalid_edit", exitCode: REFUSED_EXIT_CODE, message },
	})
	let value: unknown
	try {
		value = await request.json()
	} catch {
		return invalid("The Edit is not JSON.")
	}
	const parsed = editSchema.safeParse(value)
	return parsed.success
		? { ok: true, edit: parsed.data }
		: invalid("The Edit is not one the Dashboard may send.")
}
