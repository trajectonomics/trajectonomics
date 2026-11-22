import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { isAppError } from "../../errors"
import { readState, writeState } from "../../telemetry/state"
import { statusOf, statusOutput } from "../../telemetry/status"

export const on: Leaf = defineCommand({
	name: "on",
	summary: "Count this CLI's own use again, after traj telemetry off",
	note: "Ships in 0.5.0.",
	positionals: [],
	input: z.strictObject({}),
	output: statusOutput,
	examples: [{ command: "traj telemetry on", description: "Count again; the reason is printed." }],
	// Turning on does not override DO_NOT_TRACK, TRAJ_TELEMETRY, CI or a development build: the
	// status says which of those still stops it.
	errorCodes: ["disk_full", "not_a_directory", "permission_denied"],
	run: (_input, ctx) => {
		const failure = writeState(ctx.env, { ...readState(ctx.env), enabled: true })
		if (isAppError(failure)) return failure
		return ok(statusOf(ctx.env))
	},
})
