import { z } from "zod"
import { UUID_SHAPED } from "../../account/name"
import type { Leaf } from "../../command"
import { defineCommand, ok } from "../../command"
import { missingFieldError } from "../../document"
import { isAppError } from "../../errors"
import { DOCUMENT, exclusive, REQUIRED_NAME } from "../../scenario/apply-forms"
import { invalidScenarioName } from "../../scenario/errors"
import { printTemplate } from "../../scenario/template"
import { view, type WrittenScenario, writtenScenario } from "../../scenario/view"
import { LEDGER_READ_CODES } from "../../store"
import { withStore } from "../../with-store"

const result = z.strictObject({
	dryRun: z.boolean().describe("True when the write was rolled back."),
	status: z.enum(["created", "updated", "unchanged"]).describe("What the apply found."),
	scenario: writtenScenario,
})

export const apply: Leaf = defineCommand({
	name: "apply",
	summary: "Create or update a Scenario from a JSON document",
	positionals: ["name"],
	input: z.strictObject({
		name: z
			.string()
			.min(1)
			.optional()
			.describe("The Scenario's name; exact, case-sensitive and not shaped like a UUID."),
		file: z
			.string()
			.min(1)
			.optional()
			.describe("The JSON document's path, or - for stdin; --template prints one to start from."),
		template: z
			.boolean()
			.optional()
			.describe(
				"Print a document to start from: a minimal one, which opens no data directory, or one pre-filled with --as-of.",
			),
		asOf: z
			.string()
			.min(1)
			.optional()
			.describe(
				"With --template, pre-fill the document from the Baseline at this date, as YYYY-MM-DD.",
			),
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
	}),
	document: DOCUMENT,
	output: z.union([z.string(), result]),
	examples: [
		{
			command: "traj scenario apply --template",
			description: "Print a minimal document to start from.",
		},
		{
			command: "traj scenario apply --template --as-of 2026-03-31",
			description: "Print a Scenario pre-filled from the Baseline at one date, to edit and apply.",
		},
		{
			command: "traj scenario apply base --file base.json",
			description: "Create a Scenario, or update it when the document changed.",
		},
		{
			command: "traj scenario apply base --file -",
			description: "Read the document from stdin, for example redirected from base.json.",
		},
		{
			command: "traj scenario apply base --file base.json --dry-run",
			description: "Show the row and roll the write back.",
		},
	],
	errorCodes: [
		"database_busy",
		"invalid_input",
		"INVALID_DATE",
		"NEGATIVE_AMOUNT",
		"AMOUNT_OVERFLOW",
		"unsupported_currency",
		...LEDGER_READ_CODES,
	],
	run: (input, document, ctx) => {
		const wrong = exclusive(input)
		if (wrong !== undefined) return wrong
		if (input.template === true) return printTemplate(ctx, input.asOf)
		// The document form checks this before it reads the document; the guard keeps `name` a string.
		const name = input.name
		if (name === undefined) return missingFieldError(REQUIRED_NAME)
		if (UUID_SHAPED.test(name)) return invalidScenarioName()
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const outcome = store.saveScenario({ name, document }, { dryRun })
			if (isAppError(outcome)) return outcome
			const rendered = view(outcome.scenario)
			const scenario: WrittenScenario = {
				...rendered,
				id: dryRun && outcome.status === "created" ? null : rendered.id,
			}
			return ok({ dryRun, status: outcome.status, scenario })
		})
	},
})
