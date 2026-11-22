import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { statusOf, statusOutput } from "../../telemetry/status"

export const status: Leaf = defineCommand({
	name: "status",
	summary: "Show whether this CLI counts its own use, and why",
	note: "Ships in 0.5.0.",
	positionals: [],
	input: z.strictObject({}),
	output: statusOutput,
	examples: [{ command: "traj telemetry status", description: "Show the current choice and why." }],
	errorCodes: [],
	run: (_input, ctx) => ok(statusOf(ctx.env)),
})
