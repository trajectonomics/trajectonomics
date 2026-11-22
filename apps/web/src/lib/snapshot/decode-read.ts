import type { z } from "zod"
import { type ErrorBody, errorBody, type Read } from "../contract"

/** What one `traj` call printed: its exit code and both streams, as text. */
export type Captured = { code: number; stdout: string; stderr: string }

/** The error a Read keeps when the CLI's output does not match the contract. */
export const CONTRACT_MISMATCH = "contract_mismatch"

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) }
	} catch {
		return { ok: false }
	}
}

function mismatch(argv: string[], message: string): Read<never> {
	return { argv, ok: false, error: { code: CONTRACT_MISMATCH, exitCode: 1, message } }
}

/** The first issue of a failed parse, with the zod path that names the field. */
function describe(issue: { path: PropertyKey[]; message: string }): string {
	const path = issue.path.map(String).join(".")
	return `${path === "" ? "(root)" : path}: ${issue.message}`
}

/** The envelope a failed call printed on stderr, or a plain error when the stderr holds none. */
function failure(argv: string[], captured: Captured): Read<never> {
	const parsed = parseJson(captured.stderr)
	const envelope = parsed.ok ? errorBody.safeParse(getError(parsed.value)) : null
	if (envelope?.success) return { argv, ok: false, error: envelope.data }
	const message = captured.stderr.trim() || `traj exited with code ${captured.code}`
	return { argv, ok: false, error: unparsed(captured.code, message) }
}

function getError(value: unknown): unknown {
	return typeof value === "object" && value !== null && "error" in value ? value.error : undefined
}

function unparsed(exitCode: number, message: string): ErrorBody {
	return { code: "unparsed_error", exitCode, message }
}

/**
 * Turns one call's output into a Read: the leaf's schema checks the data of a successful call, and the
 * error envelope of a failed one is kept as the CLI printed it. Pure: the caller spawns the process.
 */
export function decodeRead<T>(argv: string[], captured: Captured, schema: z.ZodType<T>): Read<T> {
	if (captured.code !== 0) return failure(argv, captured)
	const parsed = parseJson(captured.stdout)
	if (!parsed.ok) return mismatch(argv, "stdout is not JSON")
	const checked = schema.safeParse(parsed.value)
	if (!checked.success)
		return mismatch(argv, describe(checked.error.issues[0] ?? { path: [], message: "invalid" }))
	return { argv, ok: true, data: checked.data }
}
