import { homedir } from "node:os"
import { join } from "node:path"
import pkg from "../package.json"
import type { Env } from "./command"
import { type AppError, fail } from "./errors"
import { DEVELOPMENT_VERSION } from "./telemetry/decide"

/** The one database file inside the data directory, which every command that opens or removes it names. */
export const DATABASE_FILE = "traj.db"

/** `TRAJ_HOME` if set, otherwise `~/.traj`, resolved through `os.homedir()` on every platform. */
export function dataDirectory(env: Env): string {
	const override = env["TRAJ_HOME"]
	return override ? override : join(homedir(), ".traj")
}

/** The variable that lets a development build open `~/.traj`, for the maintainer's own use of one. */
export const ALLOW_DEFAULT_HOME = "TRAJ_ALLOW_DEFAULT_HOME"

/**
 * A development build, one whose version is the repository's `0.0.0` (`bun src/index.ts`, a local
 * `bun build`), refuses to open the default data directory (cli#303, ADR-0053). It may migrate the
 * ledger past what the installed release reads, so a scratch `TRAJ_HOME` is required, or
 * `TRAJ_ALLOW_DEFAULT_HOME=1` for the maintainer's deliberate use. A published release, whose
 * version the release workflow stamps, is never refused. An empty `TRAJ_HOME` counts as unset,
 * exactly as `dataDirectory` reads it.
 */
export function defaultHomeRefusal(env: Env, version: string = pkg.version): AppError | undefined {
	if (version !== DEVELOPMENT_VERSION) return undefined
	if (env["TRAJ_HOME"]) return undefined
	if (env[ALLOW_DEFAULT_HOME] === "1") return undefined
	return fail("default_home_refused", {
		message: `This is a development build (version ${DEVELOPMENT_VERSION}) and TRAJ_HOME is not set, so it would open ${dataDirectory(env)}.`,
		hint: `Set TRAJ_HOME to a scratch directory, for example TRAJ_HOME=$(mktemp -d). To use this build on your real data on purpose, set ${ALLOW_DEFAULT_HOME}=1.`,
	})
}
