import { z } from "zod"
import type { Leaf } from "../command"
import { defineCommand, ok } from "../command"
import { isAppError } from "../errors"
import { readCarryIn } from "../projection/carryin"
import { returnModelFlagDocument } from "../projection/chance-model"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	horizonFlag,
	PROJECTION_ERROR_CODES,
} from "../projection/flags"
import { pathsFlag, seedFlag } from "./flags"
import { dashboardOutput, planOf, summaryOf } from "./input"
import { type DashboardDeps, selfCommand, startFailure } from "./run"

/** The port `traj dashboard` listens on unless `--port` says otherwise. */
export const DEFAULT_PORT = 4321

/** The `dashboard` leaf, with what it starts and waits on passed in so a test can drive it. */
export function dashboardLeaf(deps: DashboardDeps): Leaf {
	return defineCommand({
		name: "dashboard",
		summary: "Serve the Dashboard of this ledger on 127.0.0.1 until Ctrl-C",
		positionals: [],
		input: z.strictObject({
			asOf: asOfFlag.describe("The date every figure is stated at, as YYYY-MM-DD."),
			horizon: horizonFlag,
			scenario: z
				.array(z.string())
				.optional()
				.describe("A Scenario to project; none means every Scenario."),
			compare: z
				.array(z.string())
				.optional()
				.describe("A Scenario to compare; pass --compare twice."),
			birthDate: z.string().optional().describe("The birth date ages count from, as YYYY-MM-DD."),
			age: z.array(z.number()).optional().describe("An age a compare reports at."),
			monthly: z.boolean().default(false).describe("Also read each projection's monthly rows."),
			carryIn: carryInFlag,
			returnModel: z
				.string()
				.optional()
				.describe(
					"The Return model JSON file the chance of success draws from. Left out with --paths and --seed given, it is `plan`: the model built from each Scenario's own Accounts. A file wins when given.",
				),
			paths: pathsFlag,
			seed: seedFlag,
			port: z
				.number()
				.int()
				.min(0)
				.max(65535)
				.default(DEFAULT_PORT)
				.describe("The loopback port to listen on; 0 lets the system pick a free one."),
		}),
		flagDocuments: [carryInFlagDocument, returnModelFlagDocument],
		output: dashboardOutput,
		examples: [
			{
				command: "traj dashboard --as-of 2026-11-30 --horizon 2056-11-30",
				description: "Read the ledger once and open http://127.0.0.1:4321/ in a browser.",
			},
			{
				command:
					"traj dashboard --as-of 2026-11-30 --horizon 2056-11-30 --scenario volatile --paths 200 --seed 0123456789abcdef --port 0",
				description:
					"Add the chance of success from the plan's own return model (--return-model plan is the default with --paths and --seed).",
			},
			{
				command:
					"traj dashboard --as-of 2026-11-30 --horizon 2056-11-30 --compare base --compare frugal --port 0",
				description: "Compare two Scenarios, on whatever port is free.",
			},
		],
		errorCodes: PROJECTION_ERROR_CODES,
		run: async (input, ctx) => {
			const params = planOf(input)
			if (isAppError(params)) return params
			const records = input.carryIn === undefined ? [] : await readCarryIn(input.carryIn, ctx.stdin)
			if (isAppError(records)) return records
			const traj = { ...selfCommand(), env: ctx.env }
			const started = await deps.start({ traj, params, records, port: input.port })
			if (!started.ok) return startFailure(started.error)
			const { server } = started
			ctx.notify?.(`The Dashboard is on ${server.url} . Press Ctrl-C to stop.`)
			await deps.untilStopped()
			await server.stop()
			return ok(summaryOf(server.url, params, server.snapshot))
		},
	})
}
