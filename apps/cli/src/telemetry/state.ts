import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import type { Env } from "../command"
import type { AppError } from "../errors"
import { directoryStep } from "../store/io-steps"

/** The file inside the config directory that holds the usage-count state. */
export const STATE_FILE = "telemetry.json"

/**
 * What the telemetry state file holds: whether counting is on, the random id a run sends as
 * `distinct_id`, and whether the one-time notice has been printed. Nothing else is written here.
 */
export type TelemetryState = {
	enabled: boolean
	id?: string | undefined
	noticeShown?: boolean | undefined
}

export const stateSchema: z.ZodType<TelemetryState> = z.object({
	enabled: z.boolean(),
	id: z.uuid().optional(),
	noticeShown: z.boolean().optional(),
})

/** The state of a person who has never run `traj telemetry`: counting is on, no id yet. */
export const DEFAULT_STATE: TelemetryState = { enabled: true }

/**
 * The directory the state file lives in. It is deliberately outside the data directory: `traj data
 * remove` deletes `~/.traj`, and an opt-out must survive that (ADR-0045). Windows keeps config in
 * `%APPDATA%`; every other platform follows the XDG convention.
 */
export function configDirectory(
	env: Env,
	platform: string = process.platform,
	home: string = homedir(),
): string {
	if (platform === "win32") return join(env["APPDATA"] ?? join(home, "AppData", "Roaming"), "traj")
	return join(env["XDG_CONFIG_HOME"] || join(home, ".config"), "traj")
}

/** The full path of the state file, as `traj telemetry` reports it. */
export function stateFilePath(
	env: Env,
	platform: string = process.platform,
	home: string = homedir(),
): string {
	return join(configDirectory(env, platform, home), STATE_FILE)
}

/**
 * Reads the state file. A missing, unreadable or malformed file reads as the default, so a broken
 * file can never throw out of a command or change its output: it can only leave counting on, and
 * the next write replaces it.
 */
export function readState(
	env: Env,
	platform: string = process.platform,
	home: string = homedir(),
): TelemetryState {
	try {
		const parsed = stateSchema.safeParse(
			JSON.parse(readFileSync(stateFilePath(env, platform, home), "utf8")),
		)
		return parsed.success ? parsed.data : DEFAULT_STATE
	} catch {
		return DEFAULT_STATE
	}
}

/**
 * Writes the state file atomically: a temporary file beside it, then a rename, so a reader never
 * sees half a file. A filesystem failure comes back as the typed failure the rest of the CLI uses,
 * and nothing else is thrown from here.
 */
export function writeState(
	env: Env,
	state: TelemetryState,
	platform: string = process.platform,
	home: string = homedir(),
): AppError | undefined {
	const directory = configDirectory(env, platform, home)
	const file = join(directory, STATE_FILE)
	const temporary = join(directory, `.${STATE_FILE}.${randomUUID()}.tmp`)
	const written = directoryStep(directory, () => {
		mkdirSync(directory, { recursive: true, mode: 0o700 })
		writeFileSync(temporary, `${JSON.stringify(state, null, "\t")}\n`, { mode: 0o600 })
		renameSync(temporary, file)
	})
	if (written === undefined) return undefined
	try {
		unlinkSync(temporary)
	} catch {
		// The rename did not happen, or the temporary file is already gone: nothing to clean up.
	}
	return written
}
