import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { fail, isAppError } from "../../errors"
import { scenarioIsMain, scenarioNotFound } from "../../scenario/errors"
import { scenarioView, view } from "../../scenario/view"
import type { ScenarioDeleted } from "../../store"
import { withStore } from "../../with-store"

/** What a delete reports: the tombstone, and that it cleared the main plan when it did. */
function deletedReply(outcome: Extract<ScenarioDeleted, { status: "deleted" }>, dryRun: boolean) {
	const deletedAt = outcome.scenario.deletedAt
	if (deletedAt === null) return fail("internal")
	return ok({
		dryRun,
		status: "deleted" as const,
		deletedAt,
		...(outcome.wasMain ? { mainCleared: true as const } : {}),
		scenario: view(outcome.scenario),
	})
}

export const rm: Leaf = defineCommand({
	name: "rm",
	summary: "Tombstone a Scenario and free its name",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().describe("The Scenario's exact name or its id."),
		force: z
			.boolean()
			.optional()
			.describe("Remove the main plan too, which takes the main-plan mark off (ADR-0071)."),
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z.literal("deleted").describe("The Scenario was tombstoned."),
		deletedAt: z.string().describe("When the tombstone was written."),
		mainCleared: z
			.literal(true)
			.optional()
			.describe("True, and only then present, when --force removed the main plan."),
		scenario: scenarioView.describe("The row as it was, without its deletion field."),
	}),
	examples: [
		{ command: "traj scenario rm early --dry-run", description: "Show what rm would do." },
		{ command: "traj scenario rm early", description: "Retire a Scenario by name." },
		{
			command: "traj scenario rm base",
			description:
				"Refused (exit 5) while base is the main plan: choose another with scenario main.",
		},
		{
			command: "traj scenario rm base --force",
			description: "Remove the main plan anyway, which takes the main-plan mark off.",
		},
	],
	errorCodes: ["database_busy", "not_found", "scenario_is_main"],
	run: (input, ctx) =>
		withStore(ctx, (store) => {
			const row = store.getScenario(input.scenario)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(input.scenario)
			const dryRun = input.dryRun === true
			const outcome = store.deleteScenario(row.id, { dryRun, force: input.force === true })
			if (isAppError(outcome)) return outcome
			if (outcome.status === "not_found") return scenarioNotFound(input.scenario)
			if (outcome.status === "is_main") return scenarioIsMain(outcome.scenario)
			return deletedReply(outcome, dryRun)
		}),
})
