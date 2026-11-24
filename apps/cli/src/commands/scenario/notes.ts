import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { type AppError, fail, isAppError } from "../../errors"
import { scenarioNotFound } from "../../scenario/errors"
import { NOTES_MAX_CHARACTERS, normalisedNotes, notesProblem } from "../../scenario/notes"
import { noted, notedScenario } from "../../scenario/shown"
import { readUtf8Source } from "../../text-source"
import { withStore } from "../../with-store"

type Forms = { text?: string | undefined; file?: string | undefined; clear?: boolean | undefined }

/** Which form named the notes; exactly one must. */
function exclusive(input: Forms): AppError | undefined {
	const named = [input.text !== undefined, input.file !== undefined, input.clear === true]
	if (named.filter(Boolean).length === 1) return undefined
	const path = named.some(Boolean) ? "clear" : "text"
	return fail("invalid_input", {
		path,
		message: `${path}: name the notes with --text, --file (a path, or - for stdin), or take them off with --clear, and use one of the three`,
	})
}

/** The notes to store, checked; null when `--clear` takes them off. */
async function textOf(
	input: Forms,
	stdin: () => Promise<string>,
): Promise<string | null | AppError> {
	if (input.clear === true) return null
	const raw =
		input.text ??
		(await readUtf8Source(input.file ?? "-", stdin, "Save the notes as UTF-8 and retry."))
	if (isAppError(raw)) return raw
	const text = normalisedNotes(raw)
	const problem = notesProblem(text)
	if (problem === null) return text
	const path = input.file === undefined ? "text" : "file"
	return fail("invalid_input", { path, message: `${path}: ${problem}` })
}

export const notes: Leaf = defineCommand({
	name: "notes",
	summary: "Keep plain-text notes on a Scenario, or clear them",
	note: "Keeping notes on a plan ships in 0.8.0.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().min(1).describe("The Scenario's exact name or its id."),
		text: z
			.string()
			.optional()
			.describe(
				`The notes: plain UTF-8, at most ${NOTES_MAX_CHARACTERS} characters, no control character but a newline and a tab.`,
			),
		file: z.string().min(1).optional().describe("Read the notes from this path, or - for stdin."),
		clear: z.boolean().optional().describe("Remove the notes."),
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z.enum(["updated", "unchanged"]).describe("Whether the notes changed."),
		scenario: notedScenario.describe("The Scenario with the notes it keeps now."),
	}),
	examples: [
		{
			command: 'traj scenario notes early --text "Retire at 55, sell the condo in 2031."',
			description: "Write down what the plan assumes.",
		},
		{
			command: "traj scenario notes early --file notes.txt",
			description: "Keep the text of a file as the notes.",
		},
		{
			command: "traj scenario notes early --clear --dry-run",
			description: "Show the row that clearing the notes would write, and roll it back.",
		},
		{ command: "traj scenario notes early --clear", description: "Take the notes off." },
	],
	errorCodes: ["database_busy", "invalid_input", "not_found"],
	run: async (input, ctx) => {
		const wrong = exclusive(input)
		if (wrong !== undefined) return wrong
		const text = await textOf(input, ctx.stdin)
		if (isAppError(text)) return text
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const row = store.getScenario(input.scenario)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(input.scenario)
			const outcome = store.setScenarioNotes(row.id, text, { dryRun })
			if (isAppError(outcome)) return outcome
			if (outcome.status === "not_found") return scenarioNotFound(input.scenario)
			return ok({ dryRun, status: outcome.status, scenario: noted(outcome.scenario) })
		})
	},
})
