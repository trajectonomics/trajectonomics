import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { type AppError, fail, isAppError } from "../../errors"
import { scenarioNotFound } from "../../scenario/errors"
import { ref, scenarioRef } from "../../scenario/view"
import type { ScenarioRow, Store } from "../../store"
import { withStore } from "../../with-store"

/** Exactly one of a Scenario to mark and `--clear` is named. */
function refusal(input: { scenario?: string | undefined; clear?: boolean | undefined }) {
	if (input.clear === true && input.scenario !== undefined) {
		return fail("invalid_input", {
			path: "clear",
			message: "clear: --clear takes the mark off whichever plan holds it, so it names no Scenario",
		})
	}
	if (input.clear === true || input.scenario !== undefined) return undefined
	return fail("invalid_input", {
		path: "scenario",
		message: "scenario: name the Scenario to mark, or use --clear",
		hint: 'Run "traj scenario main --clear" to take the main-plan mark off.',
	})
}

/** The id of the Scenario to mark, or null for `--clear`. */
function targetOf(store: Store, name: string | undefined): string | null | AppError {
	if (name === undefined) return null
	const row = store.getScenario(name)
	if (isAppError(row)) return row
	return row === null ? scenarioNotFound(name) : row.id
}

function refOrNull(row: ScenarioRow | null) {
	return row === null ? null : ref(row)
}

export const main: Leaf = defineCommand({
	name: "main",
	summary: "Mark a Scenario as the main plan, or take the mark off",
	note: "The main plan ships in 0.8.0.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().min(1).optional().describe("The Scenario's exact name or its id."),
		clear: z.boolean().optional().describe("Take the main-plan mark off instead of setting it."),
		dryRun: z.boolean().optional().describe("Report the change and roll the write back."),
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z
			.enum(["set", "moved", "cleared", "unchanged"])
			.describe(
				"`set` marked a plan when none was marked, `moved` took the mark from `previous`, `cleared` took it off, and `unchanged` means it already was so.",
			),
		scenario: scenarioRef
			.nullable()
			.describe("The main plan after the write, or null when the mark is off."),
		previous: scenarioRef
			.nullable()
			.describe("The plan the mark left, when `moved` or `cleared`; null otherwise."),
	}),
	examples: [
		{
			command: "traj scenario main base --dry-run",
			description: "Show which plan would become the main plan, and roll it back.",
		},
		{ command: "traj scenario main base", description: "Mark base as the main plan." },
		{
			command: "traj scenario main base",
			description: "Marking the main plan again is true already: exit 0, status unchanged.",
		},
		{ command: "traj scenario main --clear", description: "Take the main-plan mark off." },
	],
	errorCodes: ["database_busy", "invalid_input", "not_found"],
	run: (input, ctx) => {
		const refused = refusal(input)
		if (refused !== undefined) return refused
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const target = targetOf(store, input.scenario)
			if (isAppError(target)) return target
			const outcome = store.setMainScenario(target, { dryRun })
			if (isAppError(outcome)) return outcome
			if (outcome.status === "not_found") return scenarioNotFound(input.scenario ?? "")
			return ok({
				dryRun,
				status: outcome.status,
				scenario: refOrNull(outcome.scenario),
				previous: refOrNull(outcome.previous),
			})
		})
	},
})
