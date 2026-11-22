import { z } from "zod"
import pkg from "../../package.json"
import type { Env } from "../command"
import { type Reason, telemetryDecision } from "./decide"
import { readState, stateFilePath } from "./state"

/** What every `traj telemetry` leaf reports: the choice, the reason, and the file that holds it. */
export type StatusOutput = { enabled: boolean; reason: Reason; file: string }

/** The status every `traj telemetry` leaf prints, so the three read the same way (ADR-0045). */
export const statusOutput: z.ZodType<StatusOutput> = z.strictObject({
	enabled: z.boolean().describe("True when this CLI counts its own use."),
	reason: z
		.enum(["on", "turned_off", "do_not_track", "env_off", "ci", "development_build"])
		.describe(
			"Why: on, turned_off (traj telemetry off), do_not_track (DO_NOT_TRACK is set), env_off (TRAJ_TELEMETRY is 0, off or false), ci (CI is set) or development_build.",
		),
	file: z.string().describe("The state file that holds the choice, an absolute path."),
})

/** The status as it is now, read from the environment and the state file, with nothing written. */
export function statusOf(env: Env): StatusOutput {
	const decision = telemetryDecision({
		env,
		state: readState(env),
		version: pkg.version,
	})
	return { enabled: decision.enabled, reason: decision.reason, file: stateFilePath(env) }
}
