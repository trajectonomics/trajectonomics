import { z } from "zod"
import { UUID_SHAPED } from "../../account/name"
import { defineCommand, type Leaf } from "../../command"
import { missingFieldError } from "../../document"
import { APPLY_EXAMPLES } from "../../scenario/apply-examples"
import { DOCUMENT, exclusive, REQUIRED_NAME } from "../../scenario/apply-forms"
import { applyResult, writeApplied } from "../../scenario/apply-write"
import { decimalFlag } from "../../scenario/decimal-schema"
import { invalidScenarioName } from "../../scenario/errors"
import { IF_HASH } from "../../scenario/if-hash"
import { printTemplate } from "../../scenario/template"
import { LEDGER_READ_CODES } from "../../store"

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
		decimal: decimalFlag,
		ifHash: IF_HASH,
	}),
	document: DOCUMENT,
	note: "The --decimal form ships in 0.8.0, and so does --if-hash.",
	output: z.union([z.string(), applyResult]),
	examples: APPLY_EXAMPLES,
	errorCodes: [
		"database_busy",
		"invalid_input",
		"INVALID_DATE",
		"INVALID_AMOUNT",
		"NEGATIVE_AMOUNT",
		"AMOUNT_OVERFLOW",
		"unsupported_currency",
		"scenario_changed",
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
		return writeApplied(ctx, {
			name,
			document,
			decimal: input.decimal === true,
			dryRun: input.dryRun === true,
			ifHash: input.ifHash,
		})
	},
})
