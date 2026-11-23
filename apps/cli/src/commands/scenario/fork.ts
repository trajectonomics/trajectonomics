import { z } from "zod"
import { UUID_SHAPED } from "../../account/name"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { isAppError } from "../../errors"
import { invalidScenarioName, scenarioNotFound } from "../../scenario/errors"
import { type Applied, reply, transformFor } from "../../scenario/fork-result"
import {
	addFlag,
	additionsField,
	appliedOverride,
	decimalFlag,
	setFlag,
	withoutFlag,
} from "../../scenario/override-flags"
import { droppedAnchors, writtenScenario } from "../../scenario/view"
import type { ForkOptions } from "../../store"
import { withStore } from "../../with-store"

export const fork: Leaf = defineCommand({
	name: "fork",
	summary: "Copy a Scenario under a new name",
	positionals: ["from", "name"],
	input: z.strictObject({
		from: z.string().min(1).describe("The source Scenario's exact name or its id."),
		name: z
			.string()
			.min(1)
			.describe("The copy's name; exact, case-sensitive and not shaped like a UUID."),
		set: setFlag,
		without: withoutFlag,
		add: addFlag,
		decimal: decimalFlag,
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z.literal("forked").describe("The source was copied."),
		overrides: z.array(appliedOverride).describe("The applied overrides, in command-line order."),
		removals: z
			.array(z.string())
			.describe("The dotted paths of the list items taken out with --without, in order."),
		additions: additionsField,
		scenario: writtenScenario,
		droppedAnchors,
	}),
	examples: [
		{ command: "traj scenario fork base early", description: "Copy a Scenario under a new name." },
		{
			command: "traj scenario fork base raise --set flows.salary.amount=50000",
			description: "Copy it with one assumption changed.",
		},
	],
	errorCodes: ["database_busy", "invalid_input", "not_found", "scenario_name_taken"],
	run: (input, ctx) => {
		if (UUID_SHAPED.test(input.name)) return invalidScenarioName()
		const sets = input.set ?? []
		const without = input.without ?? []
		const add = input.add ?? []
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const source = store.getScenario(input.from)
			if (isAppError(source)) return source
			if (source === null) return scenarioNotFound(input.from, "from")
			let applied: Applied = { overrides: [], removals: [], additions: [] }
			const options: ForkOptions = { dryRun }
			if (sets.length > 0 || without.length > 0 || add.length > 0) {
				options.transform = transformFor({ sets, without, add, decimal: input.decimal }, (done) => {
					applied = done
				})
			}
			const outcome = store.forkScenario(source.id, input.name, options)
			return reply(outcome, input.from, applied, dryRun)
		})
	},
})
