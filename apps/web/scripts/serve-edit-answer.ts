// The answers of the write path that are not an Edit's own result: a refusal, and a body that is not an
// Edit of the list. Both are the error envelope every write answer uses ([serve-edit.ts](serve-edit.ts)).
import type { ErrorBody } from "../src/lib/contract"
import { nestsPast } from "../src/lib/edit/depth"
import { type Edit, editSchema } from "../src/lib/edit/edit"
import { type Reread, rereadSchema } from "../src/lib/edit/reread"
import { type WhatIfBody, whatIfSchema } from "../src/lib/what-if/overrides"
import { json } from "./serve-respond"
import type { SnapshotRun } from "./snapshot-run"

/** The exit code a refusal carries: the write path refuses rather than runs, so none of traj's codes fits. */
export const REFUSED_EXIT_CODE = 1

/** An error envelope at a status: a failed Edit answers 200, with its error as data. */
export function failure(status: number, error: ErrorBody): Response {
	return json(status, JSON.stringify({ ok: false, error }))
}

/**
 * Answers a Snapshot run: the Snapshot, with the write's own result when it states one and the household
 * anchors and Owners it dropped when it dropped any, or the CLI's error as data.
 */
export function answerOf(
	run: SnapshotRun,
	result?: unknown,
	droppedAnchors: readonly string[] = [],
	droppedOwners: readonly string[] = [],
): Response {
	if (!run.ok) return failure(200, run.error)
	const dropped =
		(droppedAnchors.length === 0 ? "" : `,"droppedAnchors":${JSON.stringify(droppedAnchors)}`) +
		(droppedOwners.length === 0 ? "" : `,"droppedOwners":${JSON.stringify(droppedOwners)}`)
	const stated = (result === undefined ? "" : `,"result":${JSON.stringify(result)}`) + dropped
	return json(200, `{"ok":true,"snapshot":${JSON.stringify(run.snapshot)}${stated}}`)
}

/** Answers a preview: the dry run's own result, with no Snapshot, because nothing was written. */
export function answerPreview(result: unknown): Response {
	return json(200, `{"ok":true,"preview":true,"result":${JSON.stringify(result)}}`)
}

/** A refused request: its status, its code and the sentence a person reads. */
export function refused(status: number, code: string, message: string): Response {
	return failure(status, { code, exitCode: REFUSED_EXIT_CODE, message })
}

/** Runs a schema read that a hostile body could make throw (a stack overflow); that is a refusal, never a 500. */
function safely<T>(read: () => T): T | null {
	try {
		return read()
	} catch {
		return null
	}
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
	if (nestsPast(value)) return invalid("The Edit nests deeper than the Dashboard sends.")
	const parsed = safely(() => editSchema.safeParse(value))
	return parsed?.success
		? { ok: true, edit: parsed.data }
		: invalid("The Edit is not one the Dashboard may send.")
}

/** Reads the body as a what-if of the closed shape: refused when it is not JSON, or names a bad plan or Override. */
export async function readWhatIf(
	request: Request,
): Promise<{ ok: true; whatIf: WhatIfBody } | { ok: false; error: ErrorBody }> {
	const invalid = (message: string) => ({
		ok: false as const,
		error: { code: "invalid_what_if", exitCode: REFUSED_EXIT_CODE, message },
	})
	let value: unknown
	try {
		value = await request.json()
	} catch {
		return invalid("The what-if is not JSON.")
	}
	if (nestsPast(value)) return invalid("The what-if nests deeper than the Dashboard sends.")
	const parsed = safely(() => whatIfSchema.safeParse(value))
	return parsed?.success
		? { ok: true, whatIf: parsed.data }
		: invalid("The what-if is not one the Dashboard may send.")
}

/** Reads the body of a reread: refused when it is not JSON, nests too deep, or holds more than the allowance inputs. */
export async function readReread(
	request: Request,
): Promise<{ ok: true; reread: Reread } | { ok: false; error: ErrorBody }> {
	const invalid = (message: string) => ({
		ok: false as const,
		error: { code: "invalid_reread", exitCode: REFUSED_EXIT_CODE, message },
	})
	let value: unknown
	try {
		value = await request.json()
	} catch {
		return invalid("The reread is not JSON.")
	}
	if (nestsPast(value)) return invalid("The reread nests deeper than the Dashboard sends.")
	const parsed = safely(() => rereadSchema.safeParse(value))
	return parsed?.success
		? { ok: true, reread: parsed.data }
		: invalid("The reread is not one the Dashboard may send.")
}
