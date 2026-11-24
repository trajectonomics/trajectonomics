import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { isAppError } from "../../errors"
import { listed, listedScenario } from "../../scenario/shown"
import { withStore } from "../../with-store"

export const list: Leaf = defineCommand({
	name: "list",
	summary: "List the live Scenarios by name",
	note: "The taxed flag ships in 0.8.0, and so do hasNotes and main.",
	positionals: [],
	input: z.strictObject({}),
	output: z.strictObject({
		scenarios: z.array(listedScenario).describe("Every live Scenario, ordered by name then id."),
	}),
	examples: [{ command: "traj scenario list --json", description: "Show the Scenarios as JSON." }],
	errorCodes: [],
	run: (_input, ctx) =>
		withStore(ctx, (store) => {
			const rows = store.listScenarios({ sort: "name" })
			return isAppError(rows) ? rows : ok({ scenarios: rows.map(listed) })
		}),
})
