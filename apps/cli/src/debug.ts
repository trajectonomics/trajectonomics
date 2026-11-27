import type { Env } from "./command"

/**
 * The diagnostic `TRAJ_DEBUG=1` asks for: the stack of the error itself, or of the cause a guarded
 * failure carries. Without the request it prints nothing, so a run without it keeps its exact
 * bytes, and the stack never reaches a format's output (ADR-0037).
 */
export function debugDetail(error: unknown, env: Env, err: (line: string) => void): void {
	if (env["TRAJ_DEBUG"] !== "1" || error === undefined) return
	err(error instanceof Error ? (error.stack ?? error.message) : String(error))
}
