import { fileURLToPath } from "node:url"
import type { DashboardStart, ErrorBody, PlanParams } from "@trajectonomics/web/serve"
import type { Env } from "../command"
import { type AppError, type ErrorCode, fail, registry } from "../errors"

/**
 * How `traj dashboard` runs its own read leaves: the compiled binary runs itself, and a checkout
 * (`bun src/index.ts`) runs Bun on the entry file, so the Snapshot comes from this very build.
 */
export function selfCommand(
	execPath: string = process.execPath,
	modulePath: string = import.meta.path,
): { binary: string; prefix: string[] } {
	const compiled = modulePath.includes("$bunfs") || modulePath.includes("~BUN")
	if (compiled) return { binary: execPath, prefix: [] }
	return { binary: execPath, prefix: [fileURLToPath(new URL("../index.ts", import.meta.url))] }
}

/** Resolves on the first SIGINT or SIGTERM, so Ctrl-C ends the command with its result. */
export function untilStopped(): Promise<void> {
	return new Promise((resolve) => {
		const stop = (): void => {
			process.off("SIGINT", stop)
			process.off("SIGTERM", stop)
			resolve()
		}
		process.on("SIGINT", stop)
		process.on("SIGTERM", stop)
	})
}

function isErrorCode(code: string): code is ErrorCode {
	return Object.hasOwn(registry, code)
}

/**
 * The failure a start that did not serve returns. A read's failure keeps its own code, message and
 * hint, because it is this CLI's envelope; a taken port is the `--port` flag's invalid input.
 */
export function startFailure(error: ErrorBody): AppError {
	const options = { message: error.message, ...(error.hint ? { hint: error.hint } : {}) }
	if (error.code === "port_unavailable") return fail("invalid_input", { ...options, path: "port" })
	return isErrorCode(error.code) ? fail(error.code, options) : fail("internal", options)
}

/** What the leaf needs from outside, so a test can start and stop it without a server or signal. */
export type DashboardDeps = {
	start: (options: {
		traj: { binary: string; prefix: string[]; env: Env }
		params: PlanParams
		records: readonly unknown[]
		port: number
	}) => Promise<DashboardStart>
	untilStopped: () => Promise<void>
}
