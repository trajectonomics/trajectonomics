import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { isAppError } from "../../errors"
import { readState, writeState } from "../../telemetry/state"
import { statusOf, statusOutput } from "../../telemetry/status"

export const off: Leaf = defineCommand({
	name: "off",
	summary: "Stop counting this CLI's own use, and forget the id it sent",
	note: "Ships in 0.6.0.",
	positionals: [],
	input: z.strictObject({}),
	output: statusOutput,
	examples: [
		{ command: "traj telemetry off", description: "Stop counting and forget the random id." },
	],
	// Turning off drops the id, so a later `on` starts a new one that nothing links to this one.
	errorCodes: ["disk_full", "not_a_directory", "permission_denied"],
	run: (_input, ctx) => {
		const current = readState(ctx.env)
		const failure = writeState(ctx.env, {
			enabled: false,
			...(current.noticeShown === undefined ? {} : { noticeShown: current.noticeShown }),
		})
		if (isAppError(failure)) return failure
		return ok(statusOf(ctx.env))
	},
})
