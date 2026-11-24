import { z } from "zod"
import { UUID_SHAPED } from "../../account/name"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { fail, isAppError } from "../../errors"
import {
	invalidScenarioName,
	SCENARIO_NAME_MAX,
	scenarioNameTaken,
	scenarioNotFound,
} from "../../scenario/errors"
import { IF_HASH } from "../../scenario/if-hash"
import { scenarioView, view } from "../../scenario/view"
import { withStore } from "../../with-store"

export const rename: Leaf = defineCommand({
	name: "rename",
	summary: "Give a Scenario another name; its id, document and hash stay",
	note: "Renaming a plan ships in 0.8.0.",
	positionals: ["scenario", "name"],
	input: z.strictObject({
		scenario: z.string().min(1).describe("The Scenario's exact name or its id."),
		name: z
			.string()
			.min(1)
			.describe(
				`The new name; exact, case-sensitive, at most ${SCENARIO_NAME_MAX} characters and not shaped like a UUID.`,
			),
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		ifHash: IF_HASH,
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z
			.enum(["renamed", "unchanged"])
			.describe("`unchanged` when the Scenario already has this name."),
		previousName: z.string().describe("The name the Scenario had before this write."),
		scenario: scenarioView.describe("The row after the write: the same id, document and hash."),
	}),
	examples: [
		{
			command: "traj scenario rename early retire-at-55 --dry-run",
			description: "Show the row the rename would write, and roll it back.",
		},
		{
			command: "traj scenario rename early retire-at-55",
			description: "Give the Scenario early a name that says what it assumes.",
		},
		{
			command: "traj scenario rename retire-at-55 retire-at-55",
			description: "Renaming to the name it already has is true already: exit 0, status unchanged.",
		},
	],
	errorCodes: [
		"database_busy",
		"invalid_input",
		"not_found",
		"scenario_changed",
		"scenario_name_taken",
	],
	run: (input, ctx) => {
		if (UUID_SHAPED.test(input.name)) return invalidScenarioName()
		const length = Array.from(input.name).length
		if (length > SCENARIO_NAME_MAX) {
			return fail("invalid_input", {
				path: "name",
				message: `name: a scenario name is at most ${SCENARIO_NAME_MAX} characters; this one is ${length}`,
			})
		}
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const row = store.getScenario(input.scenario)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(input.scenario)
			const outcome = store.renameScenario(row.id, input.name, {
				dryRun,
				expectedHash: input.ifHash,
			})
			if (isAppError(outcome)) return outcome
			if (outcome.status === "not_found") return scenarioNotFound(input.scenario)
			if (outcome.status === "name_taken") return scenarioNameTaken(outcome.scenario.id)
			return ok({
				dryRun,
				status: outcome.status,
				previousName: row.name,
				scenario: view(outcome.scenario),
			})
		})
	},
})
