import type { Env } from "../command"

/**
 * Why telemetry is on or off, named once so `traj telemetry status` can say it and a test can pin
 * it. `telemetryDecision` checks the causes in the order its TSDoc gives.
 */
export type Reason = "on" | "turned_off" | "do_not_track" | "env_off" | "ci" | "development_build"

/**
 * The version a development build carries. The repository's own package is always this version,
 * so a build from a checkout never reports a real release's usage.
 */
export const DEVELOPMENT_VERSION = "0.0.0"

/** What the state file says, as far as the decision needs to know. */
export type StateFacts = { enabled: boolean }

export type Decision = { enabled: boolean; reason: Reason }

/** `DO_NOT_TRACK` is set when it holds anything but the empty string, `0` or `false`. */
function doNotTrack(env: Env): boolean {
	const value = env["DO_NOT_TRACK"]
	return value !== undefined && value !== "" && value !== "0" && value !== "false"
}

/** `TRAJ_TELEMETRY=0`, `off` or `false` (in any case) turns counting off for this shell. */
function envOff(env: Env): boolean {
	const value = env["TRAJ_TELEMETRY"]?.toLowerCase()
	return value === "0" || value === "off" || value === "false"
}

/** A CI runner sets `CI`; the same falsy spellings as `DO_NOT_TRACK` leave it unset. */
function continuousIntegration(env: Env): boolean {
	const value = env["CI"]
	return value !== undefined && value !== "" && value !== "0" && value !== "false"
}

/**
 * Decides whether this run counts. The first matching rule wins, in this order: `DO_NOT_TRACK`,
 * `TRAJ_TELEMETRY`, CI, the state file, the development build. So a person who set
 * `DO_NOT_TRACK` sees that reason even when the state file also says off (ADR-0045). Pure: the
 * environment, the state file and the version are the only inputs.
 */
export function telemetryDecision(input: {
	env: Env
	state: StateFacts
	version: string
}): Decision {
	if (doNotTrack(input.env)) return { enabled: false, reason: "do_not_track" }
	if (envOff(input.env)) return { enabled: false, reason: "env_off" }
	if (continuousIntegration(input.env)) return { enabled: false, reason: "ci" }
	if (!input.state.enabled) return { enabled: false, reason: "turned_off" }
	if (input.version === DEVELOPMENT_VERSION) return { enabled: false, reason: "development_build" }
	return { enabled: true, reason: "on" }
}
